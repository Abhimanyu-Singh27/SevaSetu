import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrl() {
  const configuredValue = process.env.DATABASE_URL?.trim();
  if (!configuredValue) {
    throw new Error("DATABASE_URL is required. Add a PostgreSQL connection string to the Vercel environment before building SevaSetu.");
  }
  const value = configuredValue.replace(/^["']|["']$/g, "").trim();

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL is invalid. Use a PostgreSQL URL such as postgresql://user:password@host/database?sslmode=require.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the postgresql:// or postgres:// protocol.");
  }
  if (!url.hostname || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    throw new Error("DATABASE_URL must point to a hosted PostgreSQL database reachable from Vercel, not localhost.");
  }

  if (process.env.NODE_ENV === "production" && !url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}

function createPrismaClient() {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

let runtimePrisma = globalForPrisma.prisma;

function getPrismaClient() {
  if (!runtimePrisma) {
    runtimePrisma = createPrismaClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = runtimePrisma;
  }
  return runtimePrisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
