import { NextResponse } from "next/server";
import { VerificationStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject, getSignedObjectUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });

  try {
    const verifications = await prisma.verification.findMany({
      where: { status: VerificationStatus.PENDING, documentObjectKey: { not: null } },
      orderBy: { submittedAt: "asc" },
      include: { worker: { select: { id: true, fullName: true, user: { select: { email: true } } } } },
    });
    const data = verifications.map((verification) => ({
      id: verification.id,
      workerId: verification.worker.id,
      workerName: verification.worker.fullName,
      email: verification.worker.user.email,
      submittedAt: verification.submittedAt,
      contentType: verification.documentContentType,
      sizeBytes: verification.documentSizeBytes,
      documentUrl: getSignedObjectUrl(verification.documentObjectKey!),
    }));
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Admin verification queue failed", error);
    return NextResponse.json({ error: "Verification documents are unavailable. Check private storage configuration." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const decision = body.decision === "approve" || body.decision === "reject" ? body.decision : null;
  const notes = String(body.notes || "").trim().slice(0, 500);
  if (!id || !decision) return NextResponse.json({ error: "Verification id and decision are required." }, { status: 400 });

  const verification = await prisma.verification.findUnique({ where: { id }, select: { id: true, workerId: true, status: true, documentObjectKey: true } });
  if (!verification || verification.status !== VerificationStatus.PENDING || !verification.documentObjectKey) {
    return NextResponse.json({ error: "This verification is no longer pending review." }, { status: 409 });
  }

  const status = decision === "approve" ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
  const result = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.verification.update({
      where: { id, status: VerificationStatus.PENDING },
      data: { status, reviewedBy: session.userId, reviewedAt: new Date(), notes: notes || null },
      select: { id: true, workerId: true, status: true, reviewedAt: true },
    });
    await transaction.workerProfile.update({ where: { id: verification.workerId }, data: { verificationStatus: status } });
    await transaction.auditLog.create({ data: { actorId: session.userId, action: decision === "approve" ? "WORKER_VERIFICATION_APPROVED" : "WORKER_VERIFICATION_REJECTED", targetType: "VERIFICATION", targetId: verification.id, metadata: { status } } });
    return updated;
  });

  const documentDeleted = await deleteObject(verification.documentObjectKey).catch(() => false);
  if (documentDeleted) {
    await prisma.verification.updateMany({
      where: { id: verification.id, status, documentObjectKey: verification.documentObjectKey },
      data: { documentObjectKey: null, documentContentType: null, documentSizeBytes: null },
    });
  } else {
    console.error("Reviewed identity document cleanup failed", { verificationId: verification.id });
  }

  return NextResponse.json({ data: result });
}