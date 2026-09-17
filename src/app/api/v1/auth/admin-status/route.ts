import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const adminExists = await prisma.user.count({ where: { role: "ADMIN" } }) > 0;
  return NextResponse.json({ adminExists });
}
