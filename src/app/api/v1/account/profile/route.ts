import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function text(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fullName = text(body.fullName, 120);
  const phone = text(body.phone, 30);
  if (fullName.length < 2) return NextResponse.json({ error: "Full name must be at least 2 characters" }, { status: 400 });
  if (phone && !/^\+?[0-9\s().-]{7,30}$/.test(phone)) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });

  const data = { displayName: fullName, phone: phone || null };
  if (session.role === "ADMIN") {
    const user = await prisma.user.update({ where: { id: session.userId }, data, select: { displayName: true, phone: true } });
    return NextResponse.json({ data: user });
  }

  const locationLabel = text(body.locationLabel, 40) || "Primary location";
  const addressLine = text(body.addressLine, 160);
  const city = text(body.city, 80);
  if (addressLine && !city) return NextResponse.json({ error: "City is required when adding a location" }, { status: 400 });
  if (city && !addressLine) return NextResponse.json({ error: "Address is required when adding a location" }, { status: 400 });
  const serviceIds: string[] = Array.isArray(body.serviceIds) ? [...new Set(body.serviceIds.map((value: unknown) => String(value)))] : [];

  const bio = text(body.bio, 1000);
  const experienceYears = Number(body.experienceYears);
  const serviceRadiusKm = Number(body.serviceRadiusKm);
  if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 80) return NextResponse.json({ error: "Experience must be a whole number from 0 to 80" }, { status: 400 });
  if (!Number.isFinite(serviceRadiusKm) || serviceRadiusKm < 1 || serviceRadiusKm > 200) return NextResponse.json({ error: "Service radius must be between 1 and 200 km" }, { status: 400 });

  if (session.role === "WORKER") {
    const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, active: true }, select: { id: true } });
    if (services.length !== serviceIds.length) return NextResponse.json({ error: "One or more selected services are unavailable" }, { status: 400 });
    const user = await prisma.$transaction(async (transaction) => {
      const workerProfile = await transaction.workerProfile.update({ where: { userId: session.userId }, data: { fullName, bio: bio || null, experienceYears, serviceRadiusKm }, select: { id: true } });
      await transaction.workerService.deleteMany({ where: { workerId: workerProfile.id } });
      if (services.length) await transaction.workerService.createMany({ data: services.map((service) => ({ workerId: workerProfile.id, serviceId: service.id, pricingType: "STARTING_FROM" })) });
      if (addressLine && city) {
        const existingAddress = await transaction.address.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: "asc" }, select: { id: true } });
        if (existingAddress) await transaction.address.update({ where: { id: existingAddress.id }, data: { label: locationLabel, addressLine, city } });
        else await transaction.address.create({ data: { userId: session.userId, label: locationLabel, addressLine, city } });
      }
      return transaction.user.update({ where: { id: session.userId }, data, select: { displayName: true, phone: true, workerProfile: { select: { fullName: true, bio: true, experienceYears: true, serviceRadiusKm: true } } } });
    });
    return NextResponse.json({ data: user });
  }

  const user = await prisma.$transaction(async (transaction) => {
    await transaction.customerProfile.update({ where: { userId: session.userId }, data: { fullName } });
    if (addressLine && city) {
      const existingAddress = await transaction.address.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: "asc" }, select: { id: true } });
      if (existingAddress) await transaction.address.update({ where: { id: existingAddress.id }, data: { label: locationLabel, addressLine, city } });
      else await transaction.address.create({ data: { userId: session.userId, label: locationLabel, addressLine, city } });
    }
    return transaction.user.update({ where: { id: session.userId }, data, select: { displayName: true, phone: true, customerProfile: { select: { fullName: true } } } });
  });
  return NextResponse.json({ data: user });
}
