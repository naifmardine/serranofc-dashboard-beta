import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: true });

const url = (process.env.DATABASE_URL ?? "").trim();
if (!url) throw new Error("DATABASE_URL is not set (or is empty). Check your env files");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
  migrations: { seed: "tsx prisma/seed.ts" },
});
