import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scanObject, verifyObjectExists } from "@/lib/storage";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const objectKey = String(body.objectKey || "");
  const contentType = String(body.contentType || "").toLowerCase();
  const sizeBytes = Number(body.sizeBytes);
  const requestId = body.requestId ? String(body.requestId) : undefined;
  const reportId = body.reportId ? String(body.reportId) : undefined;
  if (!objectKey.startsWith(`uploads/${session.userId}/`) || !allowedTypes.has(contentType) || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maxBytes) return NextResponse.json({ error: "Invalid upload metadata" }, { status: 400 });
  if (!requestId && !reportId) return NextResponse.json({ error: "An associated request or report is required" }, { status: 400 });
  if (requestId) {
    const record = await prisma.serviceRequest.findFirst({ where: { id: requestId, OR: [{ customer: { userId: session.userId } }, { worker: { userId: session.userId } }] }, select: { id: true } });
    if (!record) return NextResponse.json({ error: "You cannot attach a file to this request" }, { status: 403 });
  }
  if (reportId) {
    const report = await prisma.report.findFirst({ where: { id: reportId, reporterId: session.userId }, select: { id: true } });
    if (!report && session.role !== "ADMIN") return NextResponse.json({ error: "You cannot attach a file to this report" }, { status: 403 });
  }
  try {
    if (!(await verifyObjectExists(objectKey)) || !(await scanObject(objectKey))) return NextResponse.json({ error: "Upload could not be verified" }, { status: 400 });
    const asset = await prisma.fileAsset.create({ data: { objectKey, contentType, sizeBytes, ownerId: session.userId, requestId, reportId } });
    return NextResponse.json({ data: { id: asset.id, objectKey: asset.objectKey } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload verification service is unavailable" }, { status: 503 });
  }
}
