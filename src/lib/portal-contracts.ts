import { z } from "zod";

export const pricingTypes = ["FIXED", "PER_HOUR", "PER_DAY", "STARTING_FROM", "QUOTE_REQUIRED"] as const;
export const workerServiceInput = z.object({
  serviceId: z.string().uuid(), pricingType: z.enum(pricingTypes),
  price: z.number().finite().nonnegative().max(10_000_000).nullable(),
  description: z.string().trim().max(1000).default(""),
}).refine((value) => value.pricingType === "QUOTE_REQUIRED" || value.price !== null, { message: "Enter a price or choose quote required." });
export const catalogInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("category"), id: z.string().uuid().optional(), name: z.string().trim().min(2).max(100), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), description: z.string().trim().max(1000).default(""), active: z.boolean() }),
  z.object({ kind: z.literal("service"), id: z.string().uuid().optional(), categoryId: z.string().uuid(), name: z.string().trim().min(2).max(100), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), description: z.string().trim().max(1000).default(""), active: z.boolean() }),
]);
export const notificationInput = z.object({ id: z.string().uuid().optional(), read: z.boolean() });
export const moderationInput = z.object({
  id: z.string().uuid(), kind: z.enum(["report", "dispute", "fraud"]),
  status: z.enum(["UNDER_REVIEW", "INVESTIGATING", "RESOLVED", "REJECTED", "REVIEWED", "DISMISSED", "CONFIRMED"]),
  expectedStatus: z.string().min(1).max(40),
  note: z.string().trim().max(1000).default(""),
});
export const workerServiceBulkInput = z.object({
  serviceIds: z.array(z.string().uuid()).min(1).max(100).refine((ids) => new Set(ids).size === ids.length),
});
