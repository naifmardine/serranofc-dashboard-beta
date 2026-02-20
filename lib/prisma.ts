import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const raw = process.env.DATABASE_URL;

const connectionString = (raw ?? "").trim();

if (!connectionString) {
  // dá mais contexto sem vazar segredo
  throw new Error(
    `DATABASE_URL is not set (hasRaw=${raw !== undefined}, len=${raw?.length ?? 0})`,
  );
}


const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
