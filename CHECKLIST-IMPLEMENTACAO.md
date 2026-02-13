# Checklist de implementação — VIP automático Rust

## Estrutura e componentes

- [ ] Pastas separadas criadas: `backend/`, `bot/`, `plugin/`.
- [ ] Backend Node.js + TypeScript configurado.
- [ ] Bot Discord com embed fixo publicado.
- [ ] Plugin Oxide/uMod instalado em **dois** servidores Rust.

## Regras de negócio

- [ ] Planos configurados: `vip (R$15)` e `vip+ (R$30)`.
- [ ] VIP tratado como **individual por servidor**.
- [ ] Fluxo automático completo de ativação após pagamento.
- [ ] Fluxo automático completo de remoção após expiração.
- [ ] Remoção de cargo Discord ao vencer.

## JSON storage (sem banco)

- [ ] Arquivos JSON criados (`users`, `sessions`, `payments`, `subscriptions`, `actions`, `audit`).
- [ ] Validação de schema na leitura/escrita (zod/joi).
- [ ] Escrita atômica em arquivo (`write temp` + `rename`).
- [ ] Backup e rotação dos JSONs críticos.

## APIs backend

- [ ] Endpoints de bot implementados e autenticados.
- [ ] Endpoints do plugin implementados e assinados.
- [ ] OpenID Steam (`start` e `callback`) funcionando.
- [ ] Endpoint checkout InfinitePay funcionando.
- [ ] Webhook InfinitePay validando assinatura e idempotência.
- [ ] Endpoint de verificação de VIP implementado.
- [ ] Endpoint interno/job de expiração implementado.

## Bot Discord UX

- [ ] Select de servidor funcionando.
- [ ] Select de VIP funcionando.
- [ ] Botão de vínculo Steam funcionando.
- [ ] Botão de gerar pagamento funcionando.
- [ ] Confirmação visual de sucesso funcionando.
- [ ] Mensagens de erro amigáveis e acionáveis.
- [ ] Bloqueio de ações duplicadas (idempotência/debounce).

## Steam integração

- [ ] `check_authentication` implementado no callback.
- [ ] Validação estrita de `realm` e `return_to`.
- [ ] Captura segura de `steamid64` (17 dígitos) implementada.
- [ ] Proteção contra replay de nonce implementada.
- [ ] Consulta Steam Web API para sanity check implementada.

## InfinitePay integração

- [ ] `order_nsu` único gerado por pagamento.
- [ ] Redirect de sucesso usado apenas para UX.
- [ ] Webhook como fonte de verdade da aprovação.
- [ ] Reprocessamento seguro de webhook pendente.
- [ ] Proteção contra pagamento duplicado implementada.

## Plugin Rust

- [ ] Polling de ações pendentes implementado.
- [ ] Ativação VIP mapeando plano->grupo funcionando.
- [ ] Remoção VIP vencido funcionando.
- [ ] Comando `/vip status` funcionando.
- [ ] Retries de rede e `ack` de ações implementados.

## Expiração automática

- [ ] Job periódico executando (ex.: a cada 1 min).
- [ ] Backend como fonte da verdade garantido.
- [ ] Reconciliação para inconsistências implementada.
- [ ] Recuperação após queda de servidor validada.
- [ ] Logs e trilha de auditoria completos.

## Segurança distribuída

- [ ] JWT com escopos mínimos para bot.
- [ ] HMAC + timestamp + nonce para plugin/backend.
- [ ] TLS obrigatório entre serviços.
- [ ] Rate limit e proteção de brute force.
- [ ] Idempotência em checkout/webhook/ativação.
- [ ] Logs sem segredos e com `trace_id`.
- [ ] Alertas de fraude/falha operacional configurados.
