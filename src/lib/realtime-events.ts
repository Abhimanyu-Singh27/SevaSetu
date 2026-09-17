import type { Prisma } from "@prisma/client";
import type { RealtimeEventName } from "@/lib/realtime";
import { prisma } from "@/lib/prisma";

export async function recordRealtimeEvent(input: { name: RealtimeEventName; actorId: string; audienceUserIds: string[]; payload: Prisma.InputJsonValue }, writer: Prisma.TransactionClient | typeof prisma = prisma) {
  const event = await writer.realtimeEvent.create({ data: { name: input.name, actorId: input.actorId, audienceUserIds: input.audienceUserIds, payload: input.payload } });
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken && writer === prisma) {
    await fetch(`${redisUrl}/publish/sevasetu-events/${encodeURIComponent(JSON.stringify(input))}`, { headers: { Authorization: `Bearer ${redisToken}` }, cache: "no-store" }).catch(() => undefined);
  }
  return event;
}
