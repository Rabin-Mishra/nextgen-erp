import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "../generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaPromiseGlobal: Promise<PrismaClient> | undefined;
}

async function createPrismaClient(): Promise<PrismaClient> {
  const { PrismaClient } = await import("../generated/prisma/client");
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 5, // Limit connection pool size per instance to prevent exhausting Postgres in dev mode
    idleTimeoutMillis: 15000, // Automatically close idle connections quickly
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  
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
