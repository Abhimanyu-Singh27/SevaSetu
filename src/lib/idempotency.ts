import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const ttlMs = 24 * 60 * 60 * 1000;

type StoredResponse = { status: number; body: unknown };

export async function beginIdempotency(userId: string, route: string, key: string): Promise<{ replay?: StoredResponse; recordId?: string }> {
  const normalized = key.trim().slice(0, 128);
  if (!normalized) return {};
  const expiresAt = new Date(Date.now() + ttlMs);
  try {
    const record = await prisma.idempotencyKey.create({ data: { id: randomUUID(), userId, route, key: normalized, expiresAt } });
    return { recordId: record.id };
  } catch (error) {
    const existing = await prisma.idempotencyKey.findUnique({ where: { userId_route_key: { userId, route, key: normalized } }, select: { id: true, responseStatus: true, responseBody: true, expiresAt: true } });
    if (!existing || existing.expiresAt <= new Date()) return {};
    if (existing.responseStatus === null || existing.responseBody === null) return { replay: { status: 409, body: { error: "This request is already being processed" } } };
    return { replay: { status: existing.responseStatus, body: existing.responseBody } };
  }
}

export async function completeIdempotency(recordId: string, response: StoredResponse) {
  await prisma.idempotencyKey.update({ where: { id: recordId }, data: { responseStatus: response.status, responseBody: response.body as object } });
}
