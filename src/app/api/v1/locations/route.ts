import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const latitude = Number(body.latitude); const longitude = Number(body.longitude);
  if (!Boolean(body.consent) || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return NextResponse.json({ error: "Explicit consent and valid coordinates are required" }, { status: 400 });
  const days = Math.min(Math.max(Number(body.retentionDays || 30), 1), 90);
  const event = await prisma.locationEvent.create({ data: { userId: session.userId, requestId: body.requestId || undefined, latitude, longitude, consented: true, retentionUntil: new Date(Date.now() + days * 86400000) } });
  return NextResponse.json({ data: { id: event.id, retentionUntil: event.retentionUntil } }, { status: 201 });
}
