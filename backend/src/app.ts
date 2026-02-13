import express from "express";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { botRouter } from "./routes/bot.routes.js";

export const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/v1/bot", (req, res, next) => {
  const authHeader = req.header("authorization") ?? "";
  const expected = `Bearer ${env.BOT_JWT}`;

  if (authHeader !== expected) {
    res.status(401).json({ message: "Não autorizado." });
    return;
  }

  next();
});

app.use("/v1/bot", botRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Payload inválido.", issues: error.issues });
    return;
  }

  res.status(500).json({ message: "Erro interno." });
});
