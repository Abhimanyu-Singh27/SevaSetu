import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type AuthTokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAuthToken(userId: string, type: AuthTokenType, ttlMs: number) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashAuthToken(token);
  await prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await prisma.authToken.create({ data: { userId, type, tokenHash, expiresAt: new Date(Date.now() + ttlMs) } });
  return token;
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  const record = await prisma.authToken.findFirst({ where: { tokenHash: hashAuthToken(token), type, usedAt: null, expiresAt: { gt: new Date() } } });
  if (!record) return null;
  const consumed = await prisma.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  return consumed.count === 1 ? record : null;
}
