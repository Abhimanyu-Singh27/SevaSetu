import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageInput } from "@/lib/api-contracts";
import { beginIdempotency, completeIdempotency } from "@/lib/idempotency";
import { recordRealtimeEvent } from "@/lib/realtime-events";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: id, userId: session.userId } }, select: { conversationId: true } });
  if (!member) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const url = new URL(_request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
  const cursor = url.searchParams.get("cursor") || undefined;
  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, senderId: true, type: true, body: true, mediaUrl: true, createdAt: true } });
  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();
  await prisma.conversationMember.update({ where: { conversationId_userId: { conversationId: id, userId: session.userId } }, data: { lastReadAt: new Date() } });
  return NextResponse.json({ data: messages, meta: { nextCursor: hasMore ? messages.at(-1)?.id ?? null : null } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: id, userId: session.userId } }, select: { conversationId: true } });
  if (!member) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const parsed = messageInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.conversationId !== id) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  const idempotencyKey = request.headers.get("Idempotency-Key");
  const idempotency = idempotencyKey ? await beginIdempotency(session.userId, `POST:/api/v1/conversations/${id}/messages`, idempotencyKey) : {};
  if (idempotency.replay) return NextResponse.json(idempotency.replay.body, { status: idempotency.replay.status });
  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({ data: { conversationId: id, senderId: session.userId, body: parsed.data.body }, select: { id: true, conversationId: true, senderId: true, type: true, body: true, createdAt: true } });
    const recipients = await tx.conversationMember.findMany({ where: { conversationId: id, userId: { not: session.userId } }, select: { userId: true } });
    await tx.notification.createMany({ data: recipients.map((recipient) => ({ userId: recipient.userId, type: "MESSAGE" as const, title: "New message", body: parsed.data.body.slice(0, 120), data: { conversationId: id, messageId: message.id } })) });
    await tx.auditLog.create({ data: { actorId: session.userId, action: "MESSAGE_SENT", targetType: "CONVERSATION", targetId: id } });
    await recordRealtimeEvent({ name: "message.created", actorId: session.userId, audienceUserIds: recipients.map((recipient) => recipient.userId), payload: { conversationId: id, messageId: message.id } }, tx);
    return message;
  });
  const responseBody = { data: result };
  if (idempotency.recordId) await completeIdempotency(idempotency.recordId, { status: 201, body: responseBody });
  return NextResponse.json(responseBody, { status: 201 });
}
