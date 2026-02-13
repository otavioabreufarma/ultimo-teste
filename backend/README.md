# Backend (bootstrap)

Primeira entrega de implementação do backend em Node.js + TypeScript.

## O que já está pronto

- Servidor Express com rota de saúde (`GET /health`).
- Autenticação simples para rotas do bot com `Bearer BOT_JWT`.
- Endpoints iniciais do bot:
  - `POST /v1/bot/sessions`
  - `GET /v1/bot/sessions/:sessionId`
- Persistência em JSON com:
  - validação por schema (`zod`)
  - escrita atômica (`arquivo.tmp` + `rename`)

## Executar

```bash
npm install
npm run dev
```

Variáveis de ambiente opcionais:

- `PORT` (padrão: `3000`)
- `BOT_JWT` (padrão dev: `dev-bot-token-change-me`)
- `STORAGE_DIR` (padrão: `backend/storage`)
