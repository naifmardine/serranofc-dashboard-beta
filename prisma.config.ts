// prisma.config.ts
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Força carregar o .env da raiz do projeto e SOBRESCREVER envs existentes
dotenv.config({ path: ".env", override: true });

const url = (process.env.DATABASE_URL ?? "").trim();
if (!url) {
  throw new Error("DATABASE_URL is not set (or is empty). Check your .env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
  migrations: { seed: "tsx prisma/seed.ts" },
});
