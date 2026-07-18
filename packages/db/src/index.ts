import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient — avoids exhausting DB connections when this
// package is imported by multiple apps/services in local dev.
declare global {
  // eslint-disable-next-line no-var
  var __oneallPrisma: PrismaClient | undefined;
}

export const prisma = global.__oneallPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__oneallPrisma = prisma;
}

export * from "@prisma/client";
