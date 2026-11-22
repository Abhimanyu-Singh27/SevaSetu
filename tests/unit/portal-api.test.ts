import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH as notifications } from "@/app/api/v1/notifications/route";
import { PATCH as savedWorkers } from "@/app/api/v1/saved-workers/route";
import { PUT as saveService } from "@/app/api/v1/worker/services/route";
import { POST as catalog } from "@/app/api/v1/admin/catalog/route";
import { POST as transition } from "@/app/api/v1/requests/[id]/status/route";
import { PATCH as profile } from "@/app/api/v1/account/profile/route";
import { DELETE as revokeSessions } from "@/app/api/v1/account/sessions/route";
import { PATCH as moderate } from "@/app/api/v1/admin/moderation/route";

const fixture = vi.hoisted(() => {
  const table = () => ({ findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), count: vi.fn() });
  return { session: { userId: "11111111-1111-4111-8111-111111111111", email: "test@example.com", role: "CUSTOMER", sessionId: "33333333-3333-4333-8333-333333333333" } as { userId: string; email: string; role: string; sessionId: string } | null, replay: null as null | { status: number; body: unknown }, db: { user: table(), notification: table(), savedWorker: table(), workerProfile: table(), workerService: table(), service: table(), serviceCategory: table(), serviceRequest: table(), requestStatusHistory: table(), financialEntry: table(), disputeCase: table(), report: table(), fraudSignal: table(), auditLog: table(), customerProfile: table(), address: table(), session: table() } };
});
vi.mock("@/lib/auth", () => ({ getSession: async () => fixture.session }));
vi.mock("@/lib/prisma", () => ({ prisma: { ...fixture.db, $transaction: async (callback: (db: typeof fixture.db) => Promise<unknown>) => callback(fixture.db) } }));
vi.mock("@/lib/realtime-events", () => ({ recordRealtimeEvent: vi.fn() }));
vi.mock("@/lib/idempotency", () => ({ beginIdempotency: async () => fixture.replay ? { replay: fixture.replay } : {}, completeIdempotency: vi.fn() }));

const userId = "11111111-1111-4111-8111-111111111111", otherId = "22222222-2222-4222-8222-222222222222", requestId = "44444444-4444-4444-8444-444444444444";
const request = (body: unknown, method = "POST") => new Request("http://localhost/api", { method, headers: { "Content-Type": "application/json", "Idempotency-Key": "test-key" }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id: requestId }) };
function record(status: string) { return { id: requestId, status, customer: { userId: otherId }, worker: { id: otherId, userId, availability: "OFFLINE" }, service: { name: "Electrical repair" } }; }

beforeEach(() => {
  vi.resetAllMocks(); fixture.session = { userId, email: "test@example.com", role: "CUSTOMER", sessionId: "33333333-3333-4333-8333-333333333333" }; fixture.replay = null;
  fixture.db.notification.updateMany.mockResolvedValue({ count: 1 });
  fixture.db.savedWorker.upsert.mockResolvedValue({ userId, workerId: otherId });
  fixture.db.workerProfile.findFirst.mockResolvedValue({ id: otherId });
  fixture.db.workerProfile.findUnique.mockResolvedValue({ id: otherId });
  fixture.db.service.findFirst.mockResolvedValue({ id: requestId });
  fixture.db.workerService.upsert.mockResolvedValue({ id: requestId });
  fixture.db.serviceRequest.updateMany.mockResolvedValue({ count: 1 });
  fixture.db.serviceRequest.findUniqueOrThrow.mockResolvedValue({ id: requestId, status: "COMPLETED" });
  fixture.db.serviceRequest.count.mockResolvedValue(7);
});

describe("portal permissions and data mutations", () => {
  it("requires sign-in to change notifications", async () => {
    fixture.session = null;
    expect((await notifications(request({ read: true }, "PATCH"))).status).toBe(401);
    expect(fixture.db.notification.updateMany).not.toHaveBeenCalled();
  });
  it("scopes notification changes to the signed-in account", async () => {
    expect((await notifications(request({ id: otherId, read: true, userId: otherId }, "PATCH"))).status).toBe(200);
    expect(fixture.db.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId, id: otherId } }));
  });
  it("does not claim another account's notification was updated", async () => {
    fixture.db.notification.updateMany.mockResolvedValue({ count: 0 });
    expect((await notifications(request({ id: otherId, read: true }, "PATCH"))).status).toBe(404);
  });
  it("only customers can save workers", async () => {
    fixture.session!.role = "WORKER";
    expect((await savedWorkers(request({ workerId: otherId, saved: true }, "PATCH"))).status).toBe(403);
    expect(fixture.db.savedWorker.upsert).not.toHaveBeenCalled();
  });
  it("saves a real active worker under the current account", async () => {
    expect((await savedWorkers(request({ workerId: otherId, saved: true, userId: otherId }, "PATCH"))).status).toBe(200);
    expect(fixture.db.savedWorker.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId, workerId: otherId } }));
  });
  it("checks worker identity and validates pricing before saving", async () => {
    expect((await saveService(request({ serviceId: requestId, pricingType: "FIXED", price: 100 }, "PUT"))).status).toBe(403);
    fixture.session!.role = "WORKER";
    expect((await saveService(request({ serviceId: requestId, pricingType: "FIXED", price: -1 }, "PUT"))).status).toBe(400);
    expect(fixture.db.workerService.upsert).not.toHaveBeenCalled();
    expect((await saveService(request({ serviceId: requestId, pricingType: "FIXED", price: 0, workerId: userId }, "PUT"))).status).toBe(200);
    expect(fixture.db.workerService.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { workerId_serviceId: { workerId: otherId, serviceId: requestId } }, update: expect.objectContaining({ price: 0 }) }));
  });
  it("blocks catalog writes for customers and workers", async () => {
    for (const role of ["CUSTOMER", "WORKER"]) { fixture.session!.role = role; expect((await catalog(request({ kind: "category", name: "Repair", slug: "repair", active: true }))).status).toBe(403); }
    expect(fixture.db.serviceCategory.create).not.toHaveBeenCalled();
  });
  it("audits an administrator's catalog changes", async () => {
    fixture.session!.role = "ADMIN"; fixture.db.serviceCategory.create.mockResolvedValue({ id: otherId, active: true });
    expect((await catalog(request({ kind: "category", name: "Repair", slug: "repair", active: true }))).status).toBe(201);
    expect(fixture.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: userId, action: "CATALOG_CREATED", targetId: otherId }) }));
  });
  it("records completed work even if the worker is offline", async () => {
    fixture.session!.role = "WORKER"; fixture.db.serviceRequest.findUnique.mockResolvedValue(record("IN_PROGRESS"));
    expect((await transition(request({ action: "complete", earningAmount: 1200 }), params)).status).toBe(200);
    expect(fixture.db.financialEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId, requestId, amount: 1200, type: "EARNING" }) }));
    expect(fixture.db.workerProfile.update).toHaveBeenCalledWith({ where: { id: otherId }, data: { completedJobs: 7 } });
  });
  it("does not duplicate earnings when another action already changed the request", async () => {
    fixture.session!.role = "WORKER"; fixture.db.serviceRequest.findUnique.mockResolvedValue(record("IN_PROGRESS")); fixture.db.serviceRequest.updateMany.mockResolvedValue({ count: 0 });
    expect((await transition(request({ action: "complete", earningAmount: 1200 }), params)).status).toBe(409);
    expect(fixture.db.financialEntry.create).not.toHaveBeenCalled();
  });
  it("rejects work transitions from unrelated workers", async () => {
    fixture.session!.role = "WORKER"; fixture.db.serviceRequest.findUnique.mockResolvedValue({ ...record("SUBMITTED"), worker: { id: otherId, userId: otherId } });
    expect((await transition(request({ action: "accept" }), params)).status).toBe(403);
    expect(fixture.db.serviceRequest.updateMany).not.toHaveBeenCalled();
  });
  it("accepts assigned SENT requests and requires completion amounts", async () => {
    fixture.session!.role = "WORKER"; fixture.db.serviceRequest.findUnique.mockResolvedValue(record("SENT"));
    expect((await transition(request({ action: "accept" }), params)).status).toBe(200);
    expect((await transition(request({ action: "complete" }), params)).status).toBe(400);
  });
  it("replays a successful idempotent action after the request changes", async () => {
    fixture.session!.role = "WORKER"; fixture.db.serviceRequest.findUnique.mockResolvedValue(record("COMPLETED")); fixture.replay = { status: 200, body: { data: { id: requestId, status: "COMPLETED" } } };
    expect((await transition(request({ action: "complete", earningAmount: 1200 }), params)).status).toBe(200);
    expect(fixture.db.financialEntry.create).not.toHaveBeenCalled();
  });
  it("preserves pricing when a worker edits their profile", async () => {
    fixture.session!.role = "WORKER"; fixture.db.service.findMany.mockResolvedValue([{ id: requestId }]); fixture.db.workerProfile.update.mockResolvedValue({ id: otherId }); fixture.db.user.update.mockResolvedValue({ displayName: "Asha" });
    expect((await profile(request({ fullName: "Asha", experienceYears: 2, serviceRadiusKm: 10, serviceIds: [requestId] }, "PATCH"))).status).toBe(200);
    expect(fixture.db.workerService.deleteMany).toHaveBeenCalledWith({ where: { workerId: otherId, serviceId: { notIn: [requestId] } } });
    expect(fixture.db.workerService.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
  });
  it("lets customers save their profile without worker-only fields", async () => {
    fixture.db.user.update.mockResolvedValue({ displayName: "Asha" });
    expect((await profile(request({ fullName: "Asha" }, "PATCH"))).status).toBe(200);
    expect(fixture.db.workerService.deleteMany).not.toHaveBeenCalled();
  });
  it("revokes only other sessions belonging to the current user", async () => {
    fixture.db.session.updateMany.mockResolvedValue({ count: 2 });
    expect((await revokeSessions()).status).toBe(200);
    expect(fixture.db.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId, id: { not: fixture.session!.sessionId }, revokedAt: null } }));
  });
  it("does not allow customers to change support decisions", async () => {
    expect((await moderate(request({ id: requestId, kind: "report", status: "RESOLVED", expectedStatus: "SUBMITTED", note: "Issue fixed" }, "PATCH"))).status).toBe(403);
    expect(fixture.db.report.updateMany).not.toHaveBeenCalled();
  });
  it("rejects stale moderation decisions without notifying participants", async () => {
    fixture.session!.role = "ADMIN"; fixture.db.report.updateMany.mockResolvedValue({ count: 0 });
    expect((await moderate(request({ id: requestId, kind: "report", status: "RESOLVED", expectedStatus: "SUBMITTED", note: "Issue fixed" }, "PATCH"))).status).toBe(409);
    expect(fixture.db.notification.createMany).not.toHaveBeenCalled();
  });
  it("restores a completed request after its dispute is resolved", async () => {
    fixture.session!.role = "ADMIN";
    fixture.db.disputeCase.updateMany.mockResolvedValue({ count: 1 });
    fixture.db.disputeCase.findUniqueOrThrow.mockResolvedValue({ requestId, request: { status: "DISPUTED", customer: { userId: otherId }, worker: { userId } } });
    fixture.db.requestStatusHistory.findFirst.mockResolvedValue({ status: "COMPLETED" });
    expect((await moderate(request({ id: requestId, kind: "dispute", status: "RESOLVED", expectedStatus: "UNDER_REVIEW", note: "Issue fixed" }, "PATCH"))).status).toBe(200);
    expect(fixture.db.serviceRequest.updateMany).toHaveBeenCalledWith({ where: { id: requestId, status: "DISPUTED" }, data: { status: "COMPLETED" } });
    expect(fixture.db.financialEntry.create).not.toHaveBeenCalled();
    expect(fixture.db.notification.createMany).toHaveBeenCalled();
  });
});
