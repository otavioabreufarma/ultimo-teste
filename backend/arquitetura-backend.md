# Backend Node.js + TypeScript — Arquitetura, Dados e APIs

## 1) Diagrama textual da arquitetura

```text
[Discord User]
   |
   v
[Discord Bot (discord.js)] --(HTTPS + JWT Bot)-> [Backend API]
   |                                                |
   |                                                +-- JSON Files (users, vip_subscriptions, payments, etc)
   |                                                |
   |                                                +-- Steam OpenID (redirect browser)
   |                                                |
   |                                                +-- Steam Web API (GetPlayerSummaries)
   |                                                |
   |                                                +-- InfinitePay API (checkout link)
   |                                                |
   +<------------------- status --------------------+

[Player no Rust Server A/B]
   |
   v
[Plugin Oxide/uMod] --(HTTPS + HMAC + mTLS opcional)-> [Backend API]
   |                                                       |
   +<------------------- sync/commands --------------------+

[InfinitePay Webhook] --(HTTPS + assinatura + idempotência)-> [Backend API]

[Scheduler/Worker de Expiração] (no backend)
   |-- verifica VIP vencido
   |-- remove cargo Discord
   |-- remove grupo/permissão no Rust
   +-- grava auditoria
```

## 2) Quem conversa com quem

- **Bot Discord -> Backend**: cria sessão de compra, consulta status, confirma vínculo Steam, solicita checkout.
- **Usuário -> Steam OpenID -> Backend**: autenticação Steam via browser com callback seguro.
- **Backend -> Steam Web API**: valida perfil e consistência do SteamID64 capturado.
- **Backend -> InfinitePay**: cria checkout, recebe webhook de confirmação.
- **Plugin Rust -> Backend**: valida VIP ativo, puxa ações pendentes de ativação/remoção, envia heartbeat.
- **Backend -> Discord API (via Bot)**: adiciona/remove cargo VIP após confirmação/expiração.

## 3) Fluxo de dados (fim a fim)

1. Usuário abre embed fixo no Discord e seleciona **Servidor A/B** e **VIP (vip ou vip+)**.
2. Bot chama `POST /bot/sessions` e recebe `session_id` + estado `AWAITING_STEAM_LINK`.
3. Bot envia botão “Vincular Steam”, usuário abre OpenID.
4. Steam retorna no callback do backend; backend valida `openid.*`, nonce, realm, return_to e extrai `steamid64`.
5. Backend consulta Steam Web API para sanity check do usuário e marca sessão como `STEAM_LINKED`.
6. Bot chama `POST /payments/checkout` com sessão; backend cria `order_nsu` único e checkout no InfinitePay.
7. InfinitePay envia webhook `paid`; backend valida assinatura, idempotência por `event_id` e atualiza pagamento.
8. Backend cria/atualiza VIP por servidor (individual), calcula `expires_at`, gera ação pendente para plugin do servidor selecionado.
9. Plugin consome `GET /plugin/actions/pending`, ativa VIP no jogo e confirma com `POST /plugin/actions/{id}/ack`.
10. Backend manda bot atualizar mensagem (sucesso) e aplicar cargo Discord.
11. Scheduler periódico detecta vencimento, remove VIP no Rust + cargo no Discord, grava histórico.

## 4) Modelagem de dados em JSON (sem banco)

> Pasta sugerida: `backend/storage/*.json`

### 4.1 `users.json`
Campos obrigatórios:
- `user_id` (UUID)
- `discord_id` (string)
- `steam_id64` (string, opcional até vínculo)
- `created_at`, `updated_at`

```json
[
  {
    "user_id": "usr_7f8d1d9f-3f4e-4fe4-b53e-4f31aa8a9d11",
    "discord_id": "412345678901234567",
    "steam_id64": "76561198012345678",
    "created_at": "2026-02-13T10:00:00.000Z",
    "updated_at": "2026-02-13T10:05:00.000Z"
  }
]
```

### 4.2 `rust_servers.json`
Campos obrigatórios:
- `server_id` (`rust-a`, `rust-b`)
- `name`
- `plugin_auth_key_id`
- `vip_groups` (`vip`, `vip_plus`)

```json
[
  {
    "server_id": "rust-a",
    "name": "Rust Brasil #1",
    "plugin_auth_key_id": "key_rust_a",
    "vip_groups": {
      "vip": "vip",
      "vip_plus": "vipplus"
    }
  },
  {
    "server_id": "rust-b",
    "name": "Rust Brasil #2",
    "plugin_auth_key_id": "key_rust_b",
    "vip_groups": {
      "vip": "vip",
      "vip_plus": "vipplus"
    }
  }
]
```

### 4.3 `vip_plans.json`
Campos obrigatórios:
- `plan_id` (`vip`, `vip_plus`)
- `price_brl` (1500, 3000 em centavos)
- `duration_days`

```json
[
  { "plan_id": "vip", "name": "VIP", "price_brl": 1500, "duration_days": 30 },
  { "plan_id": "vip_plus", "name": "VIP+", "price_brl": 3000, "duration_days": 30 }
]
```

### 4.4 `purchase_sessions.json`
Campos obrigatórios:
- `session_id`, `discord_id`, `server_id`, `plan_id`, `state`, `idempotency_key`, `expires_at`

```json
[
  {
    "session_id": "ses_9c2e8d7a",
    "discord_id": "412345678901234567",
    "server_id": "rust-a",
    "plan_id": "vip_plus",
    "state": "CHECKOUT_CREATED",
    "steam_id64": "76561198012345678",
    "idempotency_key": "9dd3f3ef-8f0a-4706-b5bc-2b56d2d6c4cf",
    "expires_at": "2026-02-13T10:40:00.000Z",
    "created_at": "2026-02-13T10:10:00.000Z",
    "updated_at": "2026-02-13T10:12:00.000Z"
  }
]
```

### 4.5 `payments.json`
Campos obrigatórios:
- `payment_id`, `session_id`, `order_nsu`, `provider`, `amount_brl`, `status`, `checkout_url`

```json
[
  {
    "payment_id": "pay_001",
    "session_id": "ses_9c2e8d7a",
    "provider": "infinitepay",
    "order_nsu": "VIP-RUSTA-20260213-000001",
    "amount_brl": 3000,
    "status": "PAID",
    "checkout_url": "https://checkout.infinitepay.io/...",
    "provider_transaction_id": "txn_8abc",
    "paid_at": "2026-02-13T10:13:20.000Z",
    "created_at": "2026-02-13T10:12:05.000Z",
    "updated_at": "2026-02-13T10:13:20.000Z"
  }
]
```

### 4.6 `vip_subscriptions.json`
Campos obrigatórios:
- `subscription_id`, `discord_id`, `steam_id64`, `server_id`, `plan_id`, `status`, `starts_at`, `expires_at`

```json
[
  {
    "subscription_id": "sub_18",
    "discord_id": "412345678901234567",
    "steam_id64": "76561198012345678",
    "server_id": "rust-a",
    "plan_id": "vip_plus",
    "status": "ACTIVE",
    "starts_at": "2026-02-13T10:13:21.000Z",
    "expires_at": "2026-03-15T10:13:21.000Z",
    "last_payment_id": "pay_001",
    "created_at": "2026-02-13T10:13:21.000Z",
    "updated_at": "2026-02-13T10:13:21.000Z"
  }
]
```

### 4.7 `plugin_actions.json`
Campos obrigatórios:
- `action_id`, `server_id`, `steam_id64`, `action_type` (`ACTIVATE`/`REMOVE`), `status`

```json
[
  {
    "action_id": "act_772",
    "server_id": "rust-a",
    "steam_id64": "76561198012345678",
    "action_type": "ACTIVATE",
    "plan_id": "vip_plus",
    "status": "PENDING",
    "retries": 0,
    "created_at": "2026-02-13T10:13:21.500Z"
  }
]
```

### 4.8 `webhook_events.json`
Campos obrigatórios:
- `event_id`, `provider`, `event_type`, `signature_valid`, `processed`

### 4.9 `audit_logs.json`
Campos obrigatórios:
- `log_id`, `source`, `event`, `entity_type`, `entity_id`, `payload_hash`, `created_at`

## 5) Relação entre dados

- `users.discord_id` 1:1 `users.steam_id64` (após vínculo).
- `purchase_sessions` referencia `discord_id`, `server_id`, `plan_id`.
- `payments.session_id` -> `purchase_sessions.session_id`.
- `vip_subscriptions.last_payment_id` -> `payments.payment_id`.
- `vip_subscriptions` é **por servidor** (`server_id`), permitindo VIP diferente em cada servidor.
- `plugin_actions` deriva de mudanças em `vip_subscriptions`.
- `audit_logs` recebe trilha de todas as mutações críticas.

## 6) Contratos de API (Node.js)

### 6.1 Endpoints do Bot Discord

#### `POST /v1/bot/sessions`
- Auth: `Bearer BOT_JWT`
- Body:
```json
{ "discord_id": "412...", "server_id": "rust-a", "plan_id": "vip_plus" }
```
- 201:
```json
{ "session_id": "ses_9c2e8d7a", "state": "AWAITING_STEAM_LINK" }
```
- Erros: 400 input inválido, 409 sessão ativa duplicada.

#### `GET /v1/bot/sessions/:sessionId`
- Retorna estado atual (`AWAITING_STEAM_LINK`, `STEAM_LINKED`, `CHECKOUT_CREATED`, `PAID`, `EXPIRED`).

#### `POST /v1/bot/sessions/:sessionId/checkout`
- Cria checkout InfinitePay.
- 200: `{ "checkout_url": "...", "order_nsu": "..." }`

#### `GET /v1/bot/vip-status?discord_id=...&server_id=...`
- 200: `{ "active": true, "plan_id": "vip_plus", "expires_at": "..." }`

### 6.2 Endpoints do Plugin Rust

#### `POST /v1/plugin/auth/heartbeat`
- Auth: `X-Plugin-Key-Id`, `X-Plugin-Signature`, `X-Timestamp`
- Body: `{ "server_id":"rust-a", "online_players":123 }`

#### `GET /v1/plugin/actions/pending?server_id=rust-a&limit=50`
- Retorna ações pendentes para ativar/remover VIP.

#### `POST /v1/plugin/actions/:actionId/ack`
- Body: `{ "status":"DONE|FAILED", "message":"..." }`

#### `GET /v1/plugin/vip/verify?server_id=rust-a&steam_id64=...`
- 200: `{ "active": true, "plan_id":"vip", "expires_at":"..." }`

### 6.3 Steam OpenID

#### `GET /v1/auth/steam/start?session_id=...`
- Redireciona para provedor OpenID Steam.

#### `GET /v1/auth/steam/callback`
- Query OpenID padrão (`openid.ns`, `openid.claimed_id`, `openid.sig`, ...).
- Backend executa `check_authentication` server-to-server.
- 302 para página de sucesso/erro + atualiza sessão.

### 6.4 Checkout InfinitePay

#### `POST /v1/payments/checkout`
- Body:
```json
{
  "session_id": "ses_9c2e8d7a",
  "success_url": "https://.../ok",
  "cancel_url": "https://.../cancel"
}
```
- 201:
```json
{ "payment_id":"pay_001", "order_nsu":"VIP-RUSTA-...", "checkout_url":"https://..." }
```

### 6.5 Webhook InfinitePay

#### `POST /v1/webhooks/infinitepay`
- Auth: assinatura HMAC no header do provedor.
- Body: evento de pagamento (`event_id`, `status`, `order_nsu`, `amount`, `transaction_id`).
- 200 sempre que recebido; processamento assíncrono idempotente.
- Erros lógicos: marca evento inválido em `webhook_events.json`.

### 6.6 Endpoint de expiração/manual

#### `POST /v1/internal/expire/run`
- Auth: `Bearer INTERNAL_CRON_TOKEN`
- Executa varredura de vencidos e agenda remoções.

#### `GET /v1/internal/expire/report`
- Retorna resumo da última execução.

## 7) Steam OpenID + Steam Web API (detalhado)

1. Backend cria `state`/nonce atrelado a `session_id` e TTL curto (5–10 min).
2. Usuário é redirecionado para `https://steamcommunity.com/openid/login` com `realm` e `return_to` fixos.
3. Callback recebe parâmetros OpenID; backend **não confia no retorno direto**.
4. Backend chama `check_authentication` para confirmar assinatura.
5. Extrai `steamid64` de `openid.claimed_id` (`.../id/<steamid64>`).
6. Verifica formato numérico de 17 dígitos e consistência com sessão/discord.
7. Opcional: chama `ISteamUser/GetPlayerSummaries` para validar conta existente.
8. Persiste vínculo `discord_id <-> steamid64` com lock para evitar corrida.

Boas práticas:
- Validar `openid.return_to` exatamente igual ao esperado.
- Exigir HTTPS e HSTS.
- Nonce único, single-use.
- Rate limit em callbacks.
- Rejeitar troca de Steam em sessão já paga sem fluxo explícito.

Erros comuns:
- Confiar apenas no `claimed_id` sem `check_authentication`.
- Não validar realm/return_to.
- Permitir replay de callback.

## 8) InfinitePay (detalhado)

### Payload recomendado de checkout

```json
{
  "order_nsu": "VIP-RUSTA-20260213-000001",
  "amount": 3000,
  "currency": "BRL",
  "description": "VIP+ 30 dias - Rust Brasil #1",
  "customer": {
    "external_id": "412345678901234567",
    "name": "Discord User"
  },
  "metadata": {
    "session_id": "ses_9c2e8d7a",
    "server_id": "rust-a",
    "plan_id": "vip_plus",
    "steam_id64": "76561198012345678"
  },
  "success_url": "https://backend.example.com/payments/success",
  "cancel_url": "https://backend.example.com/payments/cancel",
  "webhook_url": "https://backend.example.com/v1/webhooks/infinitepay"
}
```

### Fluxo seguro

- `order_nsu` único por tentativa.
- `idempotency_key` por sessão para evitar dupla criação.
- Webhook é a fonte de verdade para `PAID`.
- Redirect pós-pagamento é apenas UX (não ativa VIP sozinho).
- Reprocessamento: worker pode reler eventos `processed=false`.

Prevenção de duplicidade:
- trava otimista por `session_id` + `status != PAID`.
- índice lógico em arquivo (mapa) por `order_nsu`.
- se webhook repetido: retornar 200 e ignorar mutação.

## 9) Expiração automática

- Backend roda job a cada 1 minuto.
- Busca `vip_subscriptions` com `status=ACTIVE && expires_at <= now`.
- Marca `EXPIRED`, cria `plugin_actions` de remoção e comando de remover cargo Discord.
- Mantém retry exponencial para falhas em Discord/plugin.
- Se servidor Rust cair: ação fica `PENDING` até heartbeat voltar.
- Reconciliação diária: compara estado backend x plugin (endpoint verify em lote).
- Auditoria: cada transição grava hash de payload e correlação (`trace_id`).

## 10) Pontos críticos de segurança

- Segredo por serviço (bot/plugin/webhook/internal) e rotação periódica.
- Assinatura HMAC + timestamp + nonce em chamadas plugin/backend.
- TLS obrigatório; mTLS recomendado para plugin em produção.
- Rate limit por IP/rota sensível.
- Idempotência em checkout, webhook e ack de ação.
- Princípio do menor privilégio no token do bot Discord.
- Sanitização/validação JSON (zod/joi) em toda entrada.
- Logs estruturados sem vazar tokens/chaves.
- Auditoria imutável de eventos financeiros e de benefício.
- Alertas para: pico de callbacks inválidos, falha de expiração, divergência de estado.
