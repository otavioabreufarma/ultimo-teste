# Plugin Rust (Oxide/uMod) — Ativação, Remoção e Status VIP

## Responsabilidades

- Ativar VIP automaticamente ao receber ação do backend.
- Remover VIP vencido automaticamente.
- Expor comando `/vip status` no servidor.
- Sincronizar estado com backend via HTTP seguro.

## Eventos monitorados

- `OnServerInitialized`: valida config e registra timer de sync.
- `OnUserConnected(IPlayer player)`: consulta rápida de status (cache local curto).
- Timer periódico (30–60s): busca ações pendentes no backend.
- Comando `/vip status`: consulta backend para resposta autoritativa.

## Comunicação com backend

1. Heartbeat: `POST /v1/plugin/auth/heartbeat`.
2. Buscar pendências: `GET /v1/plugin/actions/pending?server_id=...`.
3. Executar ação:
   - `ACTIVATE`: adiciona jogador ao grupo/permissão VIP.
   - `REMOVE`: remove grupo/permissão VIP.
4. Confirmar execução: `POST /v1/plugin/actions/:id/ack`.
5. Verificar status individual: `GET /v1/plugin/vip/verify`.

## Fluxo de ativação

1. Backend marca compra como paga e cria ação `ACTIVATE`.
2. Plugin coleta ação pendente.
3. Plugin resolve `plan_id -> grupo` (ex: `vip_plus -> vipplus`).
4. Plugin aplica grupo no Rust.
5. Plugin envia `ack DONE`.
6. Backend registra auditoria e notifica bot.

## Fluxo de remoção

1. Job de expiração no backend cria ação `REMOVE`.
2. Plugin recebe ação e remove grupo/permissão.
3. Plugin confirma `ack DONE`.
4. Backend finaliza remoção de cargo Discord.

## Comando `/vip status`

Retorno sugerido:
- Ativo: `Seu VIP+ no Rust #1 expira em 14 dias (YYYY-MM-DD HH:mm UTC)`.
- Inativo: `Você não possui VIP ativo neste servidor.`

## Tratamento de falhas

- Backend offline: fila local curta em memória para reenvio de acks.
- Falha ao aplicar grupo: `ack FAILED` com motivo + retry posterior.
- Timeout HTTP: backoff exponencial com jitter.
- Ação desconhecida ou duplicada: ignorar com log de segurança.

## Segurança

- Headers assinados com HMAC (`X-Plugin-Signature`).
- Janela de timestamp curta (ex.: 30s).
- Nonce único por requisição para evitar replay.
- Lista de IPs permitidos do backend (firewall).
- Nunca logar segredos/tokens no console do servidor.
