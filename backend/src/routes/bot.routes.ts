import { Router } from "express";
import { z } from "zod";
import { createSession, getSessionById } from "../services/sessions.service.js";

export const botRouter = Router();

const createSessionBodySchema = z.object({
  discord_id: z.string().min(5),
  server_id: z.enum(["rust-a", "rust-b"]),
  plan_id: z.enum(["vip", "vip_plus"])
});

botRouter.post("/sessions", async (req, res, next) => {
  try {
    const payload = createSessionBodySchema.parse(req.body);
    const session = await createSession(payload);

    res.status(201).json({
      session_id: session.session_id,
      state: session.state,
      expires_at: session.expires_at
    });
  } catch (error) {
    next(error);
  }
});

botRouter.get("/sessions/:sessionId", async (req, res, next) => {
  try {
    const session = await getSessionById(req.params.sessionId);

    if (!session) {
      res.status(404).json({ message: "Sessão não encontrada." });
      return;
    }

    res.status(200).json(session);
  } catch (error) {
    next(error);
  }
});
