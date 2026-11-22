import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notificationInput } from "@/lib/portal-contracts";
import { apiError } from "@/lib/portal-api";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = notificationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification details." }, { status: 400 });
  try {
    const { id, read } = parsed.data;
    const result = await prisma.notification.updateMany({ where: { userId: session.userId, ...(id ? { id } : { readAt: null }) }, data: { readAt: read ? new Date() : null } });
    if (id && !result.count) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    return NextResponse.json({ data: { updated: result.count } });
  } catch (error) { return apiError(error); }
}
