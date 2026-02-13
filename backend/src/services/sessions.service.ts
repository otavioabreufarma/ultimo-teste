import path from "node:path";
import { randomUUID } from "node:crypto";
import { customAlphabet } from "nanoid";
import { env } from "../config/env.js";
import {
  type PurchaseSession,
  purchaseSessionsSchema
} from "../schemas/entities.js";
import { JsonStore } from "../utils/json-store.js";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

const sessionsStore = new JsonStore<PurchaseSession[]>(
  path.join(env.STORAGE_DIR, "purchase_sessions.json"),
  purchaseSessionsSchema
);

const SESSION_TTL_MINUTES = 30;

type CreateSessionInput = {
  discord_id: string;
  server_id: "rust-a" | "rust-b";
  plan_id: "vip" | "vip_plus";
};

export async function createSession(
  input: CreateSessionInput
): Promise<PurchaseSession> {
  const now = new Date();
  const sessions = await sessionsStore.read();

  const session: PurchaseSession = {
    session_id: `ses_${nanoid()}`,
    discord_id: input.discord_id,
    server_id: input.server_id,
    plan_id: input.plan_id,
    state: "AWAITING_STEAM_LINK",
    idempotency_key: randomUUID(),
    expires_at: new Date(now.getTime() + SESSION_TTL_MINUTES * 60_000).toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };

  sessions.push(session);
  await sessionsStore.write(sessions);

  return session;
}

export async function getSessionById(
  sessionId: string
): Promise<PurchaseSession | null> {
  const sessions = await sessionsStore.read();
  return sessions.find((session) => session.session_id === sessionId) ?? null;
}
