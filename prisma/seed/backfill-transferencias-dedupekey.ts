// prisma/seed/backfill-transferencias-dedupekey.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";

// 1) Carrega env manualmente ANTES de QUALQUER prisma
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return false;
  const txt = fs.readFileSync(filePath, "utf8");

  for (const line of txt.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;

    const eq = l.indexOf("=");
    if (eq === -1) continue;

    const key = l.slice(0, eq).trim();
    let val = l.slice(eq + 1).trim();

    // remove aspas se tiver
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    // não sobrescreve se já existir no ambiente
    if (process.env[key] === undefined) process.env[key] = val;
  }
  return true;
}

const root = process.cwd();
const envLocal = path.join(root, ".env.local");
const env = path.join(root, ".env");

const loadedLocal = loadEnvFile(envLocal);
const loadedEnv = loadEnvFile(env);

console.log(" backfill script carregou ANTES do Prisma");
console.log("🔎 cwd:", root);
console.log("🔎 .env.local exists/loaded:", fs.existsSync(envLocal), loadedLocal);
console.log("🔎 .env exists/loaded:", fs.existsSync(env), loadedEnv);
console.log("🔎 DATABASE_URL set?", Boolean(process.env.DATABASE_URL));
console.log(
  "🔎 DATABASE_URL prefix:",
  (process.env.DATABASE_URL ?? "").slice(0, 18) || "null"
);

// 2) Helpers
function normalizeText(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dateKeyUTC(d: Date | null) {
  if (!d) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function moneyKey(valor: any) {
  if (valor == null) return "";
  const s = String(valor).trim();
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toFixed(2);
}

function makeDedupeKey(t: {
  atletaNome: string;
  clubeOrigem: string | null;
  clubeDestino: string | null;
  dataTransferencia: Date | null;
  valor: any;
  moeda: string | null;
}) {
  const atleta = normalizeText(t.atletaNome);
  const orig = normalizeText(t.clubeOrigem);
  const dest = normalizeText(t.clubeDestino);
  const data = dateKeyUTC(t.dataTransferencia);
  const val = moneyKey(t.valor);
  const moeda = normalizeText(t.moeda ?? "eur") || "eur";

  const raw = `atleta=${atleta}|orig=${orig}|dest=${dest}|data=${data}|valor=${val}|moeda=${moeda}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function main() {
  // 3) Só agora importa o prisma (garantindo env carregado)
  const { prisma } = await import("../../lib/prisma");

  console.log("🚀 backfill iniciou");
  const t0 = Date.now();

  const batch = 200;
  let cursor: string | null = null;

  let processed = 0;
  let updated = 0;
  let collisions = 0;
  let skippedAlreadyFilled = 0;
  let missingDate = 0;

  while (true) {
    const rows = await prisma.transferencia.findMany({
      take: batch,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        atletaNome: true,
        clubeOrigem: true,
        clubeDestino: true,
        dataTransferencia: true,
        valor: true,
        moeda: true,
        dedupeKey: true,
      },
    });

    if (rows.length === 0) break;

    for (const r of rows) {
      cursor = r.id;
      processed++;

      if (r.dedupeKey) {
        skippedAlreadyFilled++;
        continue;
      }

      if (!r.dataTransferencia) missingDate++;

      const key = makeDedupeKey({
        atletaNome: r.atletaNome,
        clubeOrigem: r.clubeOrigem,
        clubeDestino: r.clubeDestino,
        dataTransferencia: r.dataTransferencia,
        valor: r.valor,
        moeda: r.moeda,
      });

      try {
        await prisma.transferencia.update({
          where: { id: r.id },
          data: { dedupeKey: key },
        });
        updated++;
      } catch {
        collisions++;
        if (collisions % 20 === 1) {
          console.warn("⚠️ colisão (unique) em id=", r.id, "atleta=", r.atletaNome);
        }
      }

      if (processed % 200 === 0) {
        console.log(
          `⏳ progresso: processed=${processed} updated=${updated} collisions=${collisions} skipped=${skippedAlreadyFilled}`
        );
      }
    }
  }

  const nullLeft = await prisma.transferencia.count({
    where: { dedupeKey: null },
  });

  const tookSeconds = Number(((Date.now() - t0) / 1000).toFixed(2));

  console.log("🏁 backfill terminou");
  console.log({
    processed,
    updated,
    collisions,
    skippedAlreadyFilled,
    missingDate,
    nullLeft,
    tookSeconds,
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ backfill falhou:", e);
  process.exit(1);
});
