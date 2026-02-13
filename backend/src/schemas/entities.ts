import { z } from "zod";

const isoDateString = z.string().datetime({ offset: true });

export const purchaseSessionStateSchema = z.enum([
  "AWAITING_STEAM_LINK",
  "STEAM_LINKED",
  "CHECKOUT_CREATED",
  "PAID",
  "EXPIRED"
]);

export const purchaseSessionSchema = z.object({
  session_id: z.string().min(8),
  discord_id: z.string().min(5),
  server_id: z.enum(["rust-a", "rust-b"]),
  plan_id: z.enum(["vip", "vip_plus"]),
  state: purchaseSessionStateSchema,
  steam_id64: z.string().regex(/^\d{17}$/).optional(),
  idempotency_key: z.string().uuid(),
  expires_at: isoDateString,
  created_at: isoDateString,
  updated_at: isoDateString
});

export const purchaseSessionsSchema = z.array(purchaseSessionSchema);

export type PurchaseSession = z.infer<typeof purchaseSessionSchema>;
