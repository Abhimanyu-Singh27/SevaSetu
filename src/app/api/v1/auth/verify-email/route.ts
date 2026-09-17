import { NextResponse } from "next/server";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const record = await consumeAuthToken(token, "EMAIL_VERIFICATION");
  if (!record) return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
  await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  return NextResponse.json({ data: { verified: true, redirectUrl: "/login?verified=success" } });
}
