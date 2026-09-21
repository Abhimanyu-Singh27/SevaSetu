import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createHash, randomUUID } from "node:crypto";

export type AppRole = "CUSTOMER" | "WORKER" | "ADMIN";
export type SessionUser = { userId: string; email: string; role: AppRole };

const cookieName = "sevasetu_session";
const sessionSecret = process.env.SESSION_SECRET;
const persistentSessionAge = 7 * 24 * 60 * 60;
const adminSessionExpiry = new Date("9999-12-31T23:59:59.999Z");

function getSecret() {
  if (!sessionSecret && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production");
  return new TextEncoder().encode(sessionSecret || "local-development-secret-change-me");
}

function hashSessionId(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

export async function createSession(user: SessionUser, sessionId: string) {
  const session = new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setSubject(sessionId);
  if (user.role !== "ADMIN") session.setExpirationTime("7d");
  return session.sign(getSecret());
}

export async function setSession(user: SessionUser) {
  const sessionId = randomUUID();
  const isAdmin = user.role === "ADMIN";
  await prisma.session.create({ data: { id: sessionId, userId: user.userId, refreshHash: hashSessionId(sessionId), expiresAt: isAdmin ? adminSessionExpiry : new Date(Date.now() + persistentSessionAge * 1000) } });
  const token = await createSession(user, sessionId);
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    ...(isAdmin ? { expires: adminSessionExpiry } : { maxAge: persistentSessionAge }),
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      if (typeof payload.sub === "string") await prisma.session.updateMany({ where: { id: payload.sub, revokedAt: null }, data: { revokedAt: new Date() } });
    } catch {
      // The cookie is still cleared below when its token is expired or malformed.
    }
  }
  cookieStore.delete(cookieName);
}

export async function revokeAllSessionsForUser(userId: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = (await cookies()).get(cookieName)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    const normalizedRole = typeof payload.role === "string" ? payload.role.toUpperCase() : "";
    if (typeof payload.userId !== "string" || typeof payload.email !== "string" || typeof payload.sub !== "string" || !["CUSTOMER", "WORKER", "ADMIN"].includes(normalizedRole)) return null;
    const session = await prisma.session.findFirst({ where: { id: payload.sub, userId: payload.userId, revokedAt: null, ...(normalizedRole === "ADMIN" ? {} : { expiresAt: { gt: new Date() } }) }, select: { id: true } });
    if (!session) return null;
    const user = await prisma.user.findFirst({ where: { id: payload.userId, status: "ACTIVE" }, select: { id: true } });
    if (!user) return null;
    return { userId: payload.userId, email: payload.email, role: normalizedRole as AppRole };
  } catch {
    return null;
  }
}

export async function requireSession(roles?: AppRole[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (roles && !roles.includes(session.role)) redirect("/unauthorized");
  const user = await prisma.user.findFirst({ where: { id: session.userId, status: "ACTIVE" }, select: { id: true } });
  if (!user) redirect("/login");
  return session;
}

export function roleHome(role: AppRole) {
  return role === "ADMIN" ? "/admin" : role === "WORKER" ? "/worker" : "/customer";
}
