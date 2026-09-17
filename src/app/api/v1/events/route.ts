import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const url = new URL(request.url);
  const afterValue = url.searchParams.get("after");
  const after = afterValue ? new Date(afterValue) : new Date(Date.now() - 5 * 60 * 1000);
  if (Number.isNaN(after.getTime())) return NextResponse.json({ error: "Invalid event cursor" }, { status: 400 });
  const candidates = await prisma.realtimeEvent.findMany({ where: { createdAt: { gt: after } }, orderBy: { createdAt: "asc" }, take: 200, select: { id: true, name: true, actorId: true, audienceUserIds: true, payload: true, createdAt: true } });
  const events = candidates.filter((event) => Array.isArray(event.audienceUserIds) && event.audienceUserIds.includes(session.userId));
  return NextResponse.json({ data: events, meta: { nextCursor: candidates.at(-1)?.createdAt.toISOString() ?? after.toISOString() } });
}
