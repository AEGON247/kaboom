import { PrismaClient } from "@prisma/client";
import path from "path";

// Ensure DATABASE_URL is absolute for SQLite and points to the /prisma folder
// matching Prisma's standard resolution from the schema directory.
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl?.startsWith("file:./")) {
  const dbFile = databaseUrl.replace("file:./", "");
  databaseUrl = `file:${path.resolve(process.cwd(), "prisma", dbFile)}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
