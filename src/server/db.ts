import { PrismaClient } from "@prisma/client";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

prepareVercelSqliteDatabase();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function prepareVercelSqliteDatabase() {
  if (!process.env.VERCEL) return;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.startsWith("file:")) return;

  const targetPath = "/tmp/homepath-vercel.db";
  const sourcePath = path.join(process.cwd(), "prisma", "dev.db");
  if (!existsSync(targetPath) && existsSync(sourcePath)) {
    mkdirSync(path.dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }

  process.env.DATABASE_URL = `file:${targetPath}`;
}
