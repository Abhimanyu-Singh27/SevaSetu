import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { LocalizedDate, LocalizedText as T } from "@/components/LocalizedText";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { AvailabilityToggle } from "@/components/AvailabilityToggle";
import { PreferencesPanel } from "./PreferencesPanel";
import { MutationButton } from "./Actions";
import { Stats, Status } from "./Shared";

export async function ProfileView({ session }: { session: SessionUser }) {
  const [account, services] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { displayName: true, email: true, phone: true, role: true, status: true, createdAt: true, lastActiveAt: true, emailVerifiedAt: true, addresses: { orderBy: { createdAt: "asc" } }, customerProfile: { select: { fullName: true } }, workerProfile: { select: { fullName: true, bio: true, experienceYears: true, serviceRadiusKm: true, services: { select: { service: { select: { id: true } } } } } } } }),
    session.role === "WORKER" ? prisma.service.findMany({ where: { OR: [{ active: true, category: { active: true } }, { workers: { some: { worker: { userId: session.userId } } } }] }, orderBy: { name: "asc" }, select: { id: true, name: true, category: { select: { name: true } } } }) : [],
  ]);
  const user = { displayName: account.displayName, phone: account.phone, role: account.role, addresses: account.addresses.map(({ label, addressLine, city }) => ({ label, addressLine, city })), customerProfile: account.customerProfile, workerProfile: account.workerProfile ? { ...account.workerProfile, serviceRadiusKm: account.workerProfile.serviceRadiusKm?.toString() || null } : null };
  return <div className="portal-editor-layout"><ProfileEditForm user={user} availableServices={services} /><section className="portal-form-card"><h2><T>Account details</T></h2><dl className="portal-account-details"><div><dt><T>Email address</T></dt><dd>{account.email}</dd></div><div><dt><T>Account type</T></dt><dd><T>{account.role}</T></dd></div><div><dt><T>Status</T></dt><dd><Status value={account.status} /></dd></div><div><dt><T>Email verification</T></dt><dd><T>{account.emailVerifiedAt ? "Email verified" : "Email not verified"}</T></dd></div><div><dt><T>Member since</T></dt><dd><LocalizedDate value={account.createdAt} /></dd></div><div><dt><T>Last active</T></dt><dd>{account.lastActiveAt ? <LocalizedDate value={account.lastActiveAt} time /> : <T>Not recorded</T>}</dd></div></dl>{session.role === "WORKER" && <Link className="outline-button" href="/worker/services"><T>Manage service prices</T></Link>}</section></div>;
}

export async function SettingsView({ session }: { session: SessionUser }) {
  const sessions = await prisma.session.findMany({ where: { userId: session.userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true } });
  return <div className="portal-two-column"><PreferencesPanel /><section className="portal-form-card"><h2><T>Account security</T></h2><p><T>Active sign-in sessions</T>: <strong>{sessions.length}</strong></p><ul className="portal-session-list">{sessions.map((item) => <li key={item.id}><span><T>Signed in</T> <LocalizedDate value={item.createdAt} time /></span>{item.id === session.sessionId && <Status value="Current session" />}</li>)}</ul>{sessions.length > 1 && <MutationButton endpoint="/api/v1/account/sessions" method="DELETE" payload={{}} confirm="Sign out all other sessions?">Sign out other sessions</MutationButton>}<Link className="outline-button" href="/forgot-password"><T>Reset your password</T></Link><p className="portal-helper"><T>Password changes require a secure link sent to your registered email.</T></p></section></div>;
}

export async function AvailabilityView({ session }: { session: SessionUser }) {
  const worker = await prisma.workerProfile.findUniqueOrThrow({ where: { userId: session.userId }, select: { availability: true, serviceRadiusKm: true, verificationStatus: true, _count: { select: { services: true, requests: { where: { status: { in: ["ACCEPTED", "SCHEDULED", "EN_ROUTE", "IN_PROGRESS"] } } } } } } });
  return <><Stats items={[{ label: "Active jobs", value: worker._count.requests }, { label: "Listed services", value: worker._count.services }, { label: "Service radius (km)", value: worker.serviceRadiusKm?.toString() || "—" }]} /><section className="portal-form-card"><h2><T>Current availability</T></h2><AvailabilityToggle initial={worker.availability} /><p className="portal-helper"><T>Available means you can receive new bookings. Busy means you are working. Offline marks you unavailable for new requests; existing jobs remain accessible.</T></p><div className="portal-actions"><Link className="outline-button" href="/worker/profile"><T>Edit service area</T></Link><Link className="outline-button" href="/worker/verification"><T>Manage verification</T></Link><Status value={worker.verificationStatus} /></div></section></>;
}
