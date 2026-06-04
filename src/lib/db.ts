import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "../generated/prisma/client";

// Helper to dynamically append sslmode=no-verify and sslaccept=accept_invalid_certs to connection strings in production
function appendSslMode(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.includes("localhost") || url.includes("127.0.0.1")) return url;
  
  let updatedUrl = url;
  if (!updatedUrl.includes("sslmode=")) {
    const separator = updatedUrl.includes("?") ? "&" : "?";
    updatedUrl = `${updatedUrl}${separator}sslmode=no-verify`;
  }
  if (!updatedUrl.includes("sslaccept=")) {
    const separator = updatedUrl.includes("?") ? "&" : "?";
    updatedUrl = `${updatedUrl}${separator}sslaccept=accept_invalid_certs`;
  }
  return updatedUrl;
}

// Intercept and mutate environment variables in memory before Prisma loads them
if (process.env.POSTGRES_PRISMA_URL) {
  process.env.POSTGRES_PRISMA_URL = appendSslMode(process.env.POSTGRES_PRISMA_URL);
}
if (process.env.POSTGRES_URL_NON_POOLING) {
  process.env.POSTGRES_URL_NON_POOLING = appendSslMode(process.env.POSTGRES_URL_NON_POOLING);
}
if (process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = appendSslMode(process.env.POSTGRES_URL);
}
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = appendSslMode(process.env.DATABASE_URL);
}

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaPromiseGlobal: Promise<PrismaClient> | undefined;
}

async function createPrismaClient(): Promise<PrismaClient> {
  const { PrismaClient } = await import("../generated/prisma/client");
  const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  const isLocalhost = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");

  const pool = new Pool({ 
    connectionString,
    max: 5, // Limit connection pool size per instance to prevent exhausting Postgres in dev mode
    idleTimeoutMillis: 15000, // Automatically close idle connections quickly
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  
  // Generate the connection string with SSL parameters appended
  const prismaConnectionString = appendSslMode(connectionString);

  const client = new PrismaClient({ 
    adapter,
    datasourceUrl: prismaConnectionString,
  } as any);
  
  if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = client;
  }
  return client;
}

export async function getDb(): Promise<PrismaClient> {
  if (globalThis.prismaGlobal) {
    return globalThis.prismaGlobal;
  }
  if (globalThis.prismaPromiseGlobal) {
    return globalThis.prismaPromiseGlobal;
  }
  
  globalThis.prismaPromiseGlobal = createPrismaClient();
  return globalThis.prismaPromiseGlobal;
}
