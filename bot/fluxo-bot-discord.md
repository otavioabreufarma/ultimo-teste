# Fluxo completo do Bot Discord (discord.js + UX)

## Embed fixo (mensagem persistente)

- Canal dedicado `#comprar-vip`.
- Embed com:
  - Título: `Comprar VIP Rust`.
  - Descrição de planos: `VIP R$15` / `VIP+ R$30`.
  - Aviso: VIP é por servidor (Rust #1 ou Rust #2).
- Componentes:
  - Select menu: `Selecionar servidor` (`rust-a`, `rust-b`).
  - Select menu: `Selecionar plano` (`vip`, `vip_plus`).
  - Botão: `Vincular Steam`.
  - Botão: `Gerar Pagamento`.
  - Botão: `Verificar Status`.

## Estados do usuário

- `IDLE`: sem sessão.
- `SERVER_SELECTED`: servidor escolhido.
- `PLAN_SELECTED`: plano escolhido.
- `AWAITING_STEAM_LINK`: aguardando OpenID.
- `STEAM_LINKED`: Steam validado.
- `CHECKOUT_CREATED`: checkout emitido.
- `PAID`: pagamento confirmado.
- `ACTIVE`: VIP ativo no servidor.
- `ERROR`: falha transitória/final.

## Fluxo obrigatório

1. **Seleção servidor Rust**
   - `select_server` -> backend `POST /v1/bot/sessions` (se plano já escolhido) ou estado local temporário.
2. **Seleção VIP**
   - `select_plan` -> cria/atualiza sessão.
3. **Vínculo Steam**
   - botão abre URL `GET /v1/auth/steam/start?session_id=...`.
   - bot faz polling `GET /v1/bot/sessions/:id` até `STEAM_LINKED`.
4. **Geração pagamento**
   - botão `Gerar Pagamento` -> `POST /v1/bot/sessions/:id/checkout`.
   - responde com link ephemeral para usuário.
5. **Confirmação visual**
   - bot atualiza embed/ephemeral com `Pagamento aprovado` + `VIP ativado` + expiração.
6. **Feedback de erro**
   - mensagens claras: Steam não vinculada, webhook pendente, servidor indisponível, sessão expirada.

## Interações possíveis

- Usuário muda servidor/plano antes de pagar: sessão reescrita se ainda não paga.
- Usuário tenta gerar pagamento sem Steam: bloquear e orientar vínculo.
- Usuário clica duas vezes em “Gerar Pagamento”: retornar checkout já existente (idempotência).
- Usuário fecha navegador no OpenID: sessão expira automaticamente por TTL.

## Como evitar ações duplicadas

- `custom_id` com `session_id` + versão.
- Debounce no collector (2–3s por ação).
- Lock por usuário no backend (`active_session_by_discord`).
- Idempotency key em checkout.
- Update de mensagem com botões desabilitados quando `PAID`.

## Comunicação com backend

- Bot apenas chama backend; nenhuma regra crítica local.
- JWT específico do bot, escopo limitado às rotas `/v1/bot/*`.
- Retry com backoff para `5xx`.
- Correlação por `x-trace-id` em todas interações.
