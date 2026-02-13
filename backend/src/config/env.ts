import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  BOT_JWT: z.string().min(16).default("dev-bot-token-change-me"),
  STORAGE_DIR: z.string().default(path.resolve(process.cwd(), "storage"))
});

export const env = envSchema.parse(process.env);
