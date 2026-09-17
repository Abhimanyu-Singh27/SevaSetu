import { z } from "zod";

export const serviceRequestInput = z.object({
  serviceId: z.string().uuid(),
  workerId: z.string().uuid().optional(),
  description: z.string().trim().min(10).max(2000),
  preferredDate: z.coerce.date().optional(),
  preferredTime: z.string().trim().max(80).optional(),
  budget: z.coerce.number().nonnegative().max(10_000_000).optional(),
  locationLabel: z.string().trim().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationConsent: z.boolean().default(false),
});

export const messageInput = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export const reviewInput = z.object({
  requestId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional(),
  quality: z.number().int().min(1).max(5).optional(),
  behaviour: z.number().int().min(1).max(5).optional(),
  punctuality: z.number().int().min(1).max(5).optional(),
  communication: z.number().int().min(1).max(5).optional(),
  value: z.number().int().min(1).max(5).optional(),
});

export const reportInput = z.object({
  reportedUserId: z.string().uuid(),
  requestId: z.string().uuid().optional(),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(3000),
});

export type ServiceRequestInput = z.infer<typeof serviceRequestInput>;
export type MessageInput = z.infer<typeof messageInput>;