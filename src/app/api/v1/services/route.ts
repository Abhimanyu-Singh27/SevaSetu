import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 50);

  const services = await prisma.service.findMany({
    where: {
      active: true,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { workers: true, requests: true } },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return NextResponse.json({ data: services, meta: { limit, count: services.length } });
}