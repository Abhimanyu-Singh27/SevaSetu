import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 50);

  const workers = await prisma.workerProfile.findMany({
    where: {
      user: { status: "ACTIVE" },
      ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { services: { some: { service: { name: { contains: search, mode: "insensitive" } } } } }] } : {}),
    },
    select: {
      id: true,
      fullName: true,
      bio: true,
      avatarUrl: true,
      availability: true,
      verificationStatus: true,
      ratingAverage: true,
      ratingCount: true,
      completedJobs: true,
      responseRate: true,
      services: { select: { pricingType: true, price: true, service: { select: { name: true, slug: true } } } },
    },
    orderBy: [{ verificationStatus: "desc" }, { ratingAverage: "desc" }, { completedJobs: "desc" }],
    take: limit,
  });

  return NextResponse.json({ data: workers, meta: { limit, count: workers.length } });
}