import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is not set. Add it to your app .env before using @aegishire/db.");
}

const parsedUrl = new URL(databaseUrl);
const adapter = new PrismaPg({
    connectionString: databaseUrl,
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password ?? ""),
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 5432),
    database: parsedUrl.pathname.replace(/^\//, ""),
});
// Use globalThis for broader environment compatibility
const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: PrismaClient;
};
// Named export with global memoization
export const prisma: PrismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
    });
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
} 