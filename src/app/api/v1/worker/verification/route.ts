import { NextResponse } from "next/server";
import { VerificationStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createObjectKey, deleteObject, getObjectMetadata, presignObject, scanObject } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxBytes = 10 * 1024 * 1024;

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") return NextResponse.json({ error: "Worker access required" }, { status: 403 });
  const worker = await prisma.workerProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, verificationStatus: true, verification: { select: { status: true, submittedAt: true, notes: true, documentObjectKey: true } } },
  });
  if (!worker) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
  return NextResponse.json({
    data: {
      status: worker.verificationStatus,
      submittedAt: worker.verification?.submittedAt,
      notes: worker.verification?.status === VerificationStatus.REJECTED ? worker.verification.notes : null,
      documentSubmitted: Boolean(worker.verification?.documentObjectKey),
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") return NextResponse.json({ error: "Worker access required" }, { status: 403 });
  const limit = await rateLimit(`worker:verification:${session.userId}`, 5, 3600);
  if (!limit.allowed) return NextResponse.json({ error: "Too many verification uploads. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  const body = await request.json().catch(() => ({}));
  const action = body.action === "complete" ? "complete" : body.action === "presign" ? "presign" : null;
  const contentType = String(body.contentType || "").toLowerCase();
  const sizeBytes = Number(body.sizeBytes);
  if (!action || !allowedTypes.has(contentType) || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maxBytes) {
    return NextResponse.json({ error: "Upload a JPG, PNG, WebP, or PDF up to 10 MB." }, { status: 400 });
  }

  const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId }, select: { id: true, verificationStatus: true } });
  if (!worker) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
  if (worker.verificationStatus === VerificationStatus.VERIFIED) return NextResponse.json({ error: "Your identity is already verified." }, { status: 409 });
  if (worker.verificationStatus === VerificationStatus.PENDING) return NextResponse.json({ error: "Your document is already awaiting review." }, { status: 409 });

  if (action === "presign") {
    const fileName = String(body.fileName || "government-id").slice(0, 120);
    try {
      const objectKey = createObjectKey(session.userId, fileName || "government-id.pdf");
      const signed = presignObject("PUT", objectKey, contentType);
      return NextResponse.json({ data: { objectKey, uploadUrl: signed.url, headers: signed.headers, expiresInSeconds: 900, maxBytes } }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return NextResponse.json({ error: "Private document storage is not configured." }, { status: 503 });
    }
  }

  const objectKey = String(body.objectKey || "");
  if (!objectKey.startsWith(`uploads/${session.userId}/`)) return NextResponse.json({ error: "Invalid document upload." }, { status: 400 });
  try {
    const metadata = await getObjectMetadata(objectKey);
    if (!metadata || metadata.sizeBytes !== sizeBytes || metadata.contentType !== contentType || !(await scanObject(objectKey))) {
      await deleteObject(objectKey).catch(() => false);
      return NextResponse.json({ error: "The uploaded document could not be verified. Try another clear image or PDF." }, { status: 400 });
    }

    const previous = await prisma.verification.findUnique({ where: { workerId: worker.id }, select: { documentObjectKey: true } });
    await prisma.$transaction(async (transaction) => {
      const currentWorker = await transaction.workerProfile.findUnique({ where: { id: worker.id }, select: { verificationStatus: true } });
      if (!currentWorker || currentWorker.verificationStatus === VerificationStatus.VERIFIED) throw new Error("VERIFICATION_ALREADY_APPROVED");
      if (currentWorker.verificationStatus === VerificationStatus.PENDING) throw new Error("VERIFICATION_ALREADY_PENDING");
      await transaction.verification.upsert({
        where: { workerId: worker.id },
        create: { workerId: worker.id, status: VerificationStatus.PENDING, documentObjectKey: objectKey, documentContentType: contentType, documentSizeBytes: sizeBytes, submittedAt: new Date() },
        update: { status: VerificationStatus.PENDING, documentObjectKey: objectKey, documentContentType: contentType, documentSizeBytes: sizeBytes, submittedAt: new Date(), reviewedBy: null, reviewedAt: null, notes: null },
      });
      await transaction.workerProfile.update({ where: { id: worker.id }, data: { verificationStatus: VerificationStatus.PENDING } });
    });
    if (previous?.documentObjectKey && previous.documentObjectKey !== objectKey) await deleteObject(previous.documentObjectKey).catch(() => false);
    return NextResponse.json({ data: { status: VerificationStatus.PENDING, submittedAt: new Date().toISOString() } }, { status: 201 });
  } catch (error) {
    await deleteObject(objectKey).catch(() => false);
    if (error instanceof Error && error.message === "VERIFICATION_ALREADY_APPROVED") {
      return NextResponse.json({ error: "Your identity is already verified." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "VERIFICATION_ALREADY_PENDING") {
      return NextResponse.json({ error: "Your document is already awaiting review." }, { status: 409 });
    }
    console.error("Worker identity submission failed", error);
    return NextResponse.json({ error: "Unable to submit your identity document. Try again later." }, { status: 503 });
  }
}