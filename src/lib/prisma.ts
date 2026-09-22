import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is required. Add a PostgreSQL connection string to the Vercel environment before building SevaSetu.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL is invalid. Use a PostgreSQL URL such as postgresql://user:password@host/database?sslmode=require.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the postgresql:// or postgres:// protocol.");
  }

  // Preserve provider-specific query parameters exactly as configured.
  return value;
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
