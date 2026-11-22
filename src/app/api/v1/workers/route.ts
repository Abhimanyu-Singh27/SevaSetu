import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { serviceSearchTerm, distanceKm } from "@/lib/marketplace-search";
import { apiError } from "@/lib/portal-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = serviceSearchTerm(url.searchParams.get("q") || "");
  const city = url.searchParams.get("city")?.trim();
  const rawLimit = Number(url.searchParams.get("limit") || 20);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 50) : 20;
  const location = url.searchParams.has("latitude") || url.searchParams.has("longitude") ? z.object({ latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) }).safeParse({ latitude: url.searchParams.get("latitude") ?? undefined, longitude: url.searchParams.get("longitude") ?? undefined }) : null;
  if (location && !location.success) return NextResponse.json({ error: "Enter a valid location." }, { status: 400 });
  try {
    const origin = location?.success ? location.data : null;
    const workers = await prisma.workerProfile.findMany({
      where: { user: { status: "ACTIVE", ...(city && !origin ? { addresses: { some: { city: { contains: city, mode: "insensitive" } } } } : {}) }, services: { some: { service: { active: true, category: { active: true } } } },
        ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { services: { some: { service: { active: true, OR: [{ name: { contains: search, mode: "insensitive" } }, { category: { name: { contains: search, mode: "insensitive" } } }] } } } }] } : {}),
        ...(origin ? { latitude: { gte: Math.max(-90, origin.latitude - 1.81), lte: Math.min(90, origin.latitude + 1.81) }, longitude: { not: null } } : {}),
      },
      select: { id: true, fullName: true, bio: true, avatarUrl: true, availability: true, verificationStatus: true, ratingAverage: true, ratingCount: true, responseRate: true, latitude: true, longitude: true, serviceRadiusKm: true,
        user: { select: { addresses: { orderBy: { createdAt: "asc" }, take: 1, select: { city: true } } } },
        _count: { select: { requests: { where: { completedAt: { not: null } } } } },
        services: { where: { service: { active: true, category: { active: true } } }, select: { pricingType: true, price: true, service: { select: { name: true, slug: true } } } },
      },
      orderBy: [{ ratingAverage: "desc" }, { ratingCount: "desc" }, { id: "asc" }], take: origin ? 500 : limit,
    });
    const results = workers.map(({ latitude, longitude, serviceRadiusKm, user, _count, ...worker }) => {
      const distance = origin && latitude !== null && longitude !== null ? distanceKm(origin, { latitude: Number(latitude), longitude: Number(longitude) }) : null;
      return { ...worker, city: user.addresses[0]?.city || null, completedJobs: _count.requests, distanceKm: distance === null ? null : Math.round(distance * 10) / 10, inRange: !origin || distance !== null && distance <= Number(serviceRadiusKm || 0) };
    }).filter((worker) => worker.inRange).slice(0, limit).map((worker) => ({ id: worker.id, fullName: worker.fullName, bio: worker.bio, avatarUrl: worker.avatarUrl, availability: worker.availability, verificationStatus: worker.verificationStatus, ratingAverage: worker.ratingAverage, ratingCount: worker.ratingCount, responseRate: worker.responseRate, services: worker.services, city: worker.city, completedJobs: worker.completedJobs, distanceKm: worker.distanceKm }));
    return NextResponse.json({ data: results, meta: { limit, count: results.length } });
  } catch (error) { return apiError(error, "Marketplace information is temporarily unavailable."); }
}
