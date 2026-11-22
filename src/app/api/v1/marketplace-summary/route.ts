import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/portal-api";

export async function GET() {
  try {
    const [workers, completedJobs, ratings, categories] = await Promise.all([
      prisma.workerProfile.count({ where: { user: { status: "ACTIVE" } } }),
      prisma.serviceRequest.count({ where: { OR: [{ status: "COMPLETED" }, { completedAt: { not: null } }] } }),
      prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
      prisma.serviceCategory.findMany({ where: { active: true, services: { some: { active: true } } }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, description: true } }),
    ]);
    return NextResponse.json({ data: { workers, completedJobs, rating: ratings._avg.rating, ratingCount: ratings._count._all, categories } }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (error) { return apiError(error, "Marketplace information is temporarily unavailable."); }
}
