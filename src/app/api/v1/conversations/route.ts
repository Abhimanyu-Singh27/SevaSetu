import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const conversations = await prisma.conversation.findMany({
    where: { members: { some: { userId: session.userId } } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      request: { select: { id: true, status: true, service: { select: { name: true } } } },
      members: { select: { userId: true, lastReadAt: true, user: { select: { id: true, displayName: true, customerProfile: { select: { fullName: true } }, workerProfile: { select: { fullName: true } } } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, body: true, senderId: true, createdAt: true } },
    },
  });
  return NextResponse.json({ data: conversations });
}
