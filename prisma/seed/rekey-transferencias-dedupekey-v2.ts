// prisma/seed/rekey-transferencias-dedupekey-v2.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * ENV LOADER (não depende de Prisma/Next)
 */
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

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * NORMALIZAÇÕES (V2)
 */
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

function moneyKey(valor: unknown) {
  if (valor == null) return "";
  let s = String(valor).trim();
  // remove símbolos, espaços etc
  s = s.replace(/[^\d,.\-]/g, "");
  // aceita 34.000.000,00
  s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

function makeDedupeKeyV2(t: {
  atletaNome: string;
  atletaIdade: number | null;
  atletaPosicao: string | null;
  clubeOrigem: string | null;
  clubeFormador: string | null;
  clubeDestino: string | null;
  valor: unknown;
  moeda: string | null;
}) {
  const atleta = normalizeText(t.atletaNome);
  const idade = t.atletaIdade == null ? "" : String(t.atletaIdade);
  const pos = normalizeText(t.atletaPosicao);
  const orig = normalizeText(t.clubeOrigem);
  const form = normalizeText(t.clubeFormador);
  const dest = normalizeText(t.clubeDestino);
  const val = moneyKey(t.valor);
  const moeda = normalizeText(t.moeda ?? "eur") || "eur";

  const raw = `atleta=${atleta}|idade=${idade}|pos=${pos}|orig=${orig}|form=${form}|dest=${dest}|valor=${val}|moeda=${moeda}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  return { raw, hash };
}

async function main() {
  const root = process.cwd();
  const envLocal = path.join(root, ".env.local");
  const env = path.join(root, ".env");

  const loadedLocal = loadEnvFile(envLocal);
  const loadedEnv = loadEnvFile(env);

  console.log(" rekey v2 carregou ANTES do Prisma");
  console.log("🔎 cwd:", root);
  console.log("🔎 .env.local exists/loaded:", fs.existsSync(envLocal), loadedLocal);
  console.log("🔎 .env exists/loaded:", fs.existsSync(env), loadedEnv);
  console.log("🔎 DATABASE_URL set?", Boolean(process.env.DATABASE_URL));
  console.log(
    "🔎 DATABASE_URL prefix:",
    (process.env.DATABASE_URL ?? "").slice(0, 18) || "null"
  );

  const { prisma } = await import("../../lib/prisma");

  // 🔥 Prova de qual DB/schema você está usando (pra matar o bug “tabela mostra X mas script vê Y”)
  const who = await prisma.$queryRaw<
    Array<{ db: string; schema: string; user: string; now: Date }>
  >`select current_database() as db, current_schema() as schema, current_user as user, now() as now`;

  console.log("🧭 DB INFO:", who?.[0] ?? null);

  const totalBefore = await prisma.transferencia.count();
  console.log("🧮 COUNT transferencias (antes):", totalBefore);

  console.log("🚀 REKEY V2 INICIOU");

  const all = await prisma.transferencia.findMany({
    select: {
      id: true,
      criadoEm: true,
      atletaNome: true,
      atletaIdade: true,
      atletaPosicao: true,
      clubeOrigem: true,
      clubeFormador: true,
      clubeDestino: true,
      valor: true,
      moeda: true,
      dedupeKey: true,
    },
    orderBy: { criadoEm: "asc" },
  });

  console.log("📦 loaded rows:", all.length);

  // 1) Agrupa por nova chave V2
  const groups = new Map<string, typeof all>();
  const rawByKey = new Map<string, string>();
  const keyById = new Map<string, string>();

  // logs: só amostra alguns, pra não virar spam
  const SAMPLE_LOG_LIMIT = 3;
  let sampleLogged = 0;

  for (const r of all) {
    const { raw, hash } = makeDedupeKeyV2({
      atletaNome: r.atletaNome,
      atletaIdade: r.atletaIdade ?? null,
      atletaPosicao: r.atletaPosicao ?? null,
      clubeOrigem: r.clubeOrigem ?? null,
      clubeFormador: r.clubeFormador ?? null,
      clubeDestino: r.clubeDestino ?? null,
      valor: r.valor,
      moeda: r.moeda ?? null,
    });

    keyById.set(r.id, hash);
    if (!rawByKey.has(hash)) rawByKey.set(hash, raw);

    const arr = groups.get(hash) ?? [];
    arr.push(r);
    groups.set(hash, arr);

    if (sampleLogged < SAMPLE_LOG_LIMIT) {
      sampleLogged++;
      console.log("🔑 SAMPLE ID:", r.id);
      console.log("   atleta:", r.atletaNome);
      console.log("   raw:", raw);
      console.log("   newHash:", hash);
      console.log("   oldKey:", r.dedupeKey);
      console.log("------------------------------------------------");
    }
  }

  console.log("📦 TOTAL GRUPOS (V2 keys):", groups.size);

  // 2) Decide quem fica / quem sai
  // regra: mantém o MAIS ANTIGO por criadoEm
  const toDelete: string[] = [];
  const toKeep: Array<{ id: string; key: string }> = [];

  let dupGroups = 0;
  let maxGroupSize = 1;

  for (const [k, arr] of groups.entries()) {
    if (arr.length > 1) {
      dupGroups++;
      maxGroupSize = Math.max(maxGroupSize, arr.length);

      console.log("⚠️ DUPLICATA DETECTADA (V2) key:", k);
      console.log("   raw:", rawByKey.get(k) ?? "(raw missing)");
      arr.forEach((x) => {
        console.log("   ->", x.id, x.atletaNome, x.criadoEm.toISOString(), "oldKey=", x.dedupeKey);
      });
      console.log("------------------------------------------------");
    }

    arr.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
    const keeper = arr[0]!;
    toKeep.push({ id: keeper.id, key: k });

    for (let i = 1; i < arr.length; i++) toDelete.push(arr[i]!.id);
  }

  console.log("📌 dupGroups:", dupGroups, "maxGroupSize:", maxGroupSize);
  console.log("🟢 willKeep:", toKeep.length);
  console.log("🔴 willDelete:", toDelete.length);

  // 3) Deleta duplicados (fora de transaction longa)
  if (toDelete.length) {
    console.log("🧹 deletando duplicados em chunks...");
    const delChunks = chunk(toDelete, 500);
    let deletedTotal = 0;

    for (let i = 0; i < delChunks.length; i++) {
      const ids = delChunks[i]!;
      const res = await prisma.transferencia.deleteMany({
        where: { id: { in: ids } },
      });
      deletedTotal += res.count;
      console.log(`    delete chunk ${i + 1}/${delChunks.length}:`, res.count);
    }

    console.log("🧹 deletedTotal:", deletedTotal);
  } else {
    console.log("🧹 nenhum duplicado pra deletar (V2).");
  }

  // 4) Fase de segurança: zera dedupeKey -> null antes de setar a nova
  // (evita conflito bobo com UNIQUE durante updates)
  console.log("🧽 zerando dedupeKey para null (keepers)...");
  const keepIds = toKeep.map((x) => x.id);
  const nullChunks = chunk(keepIds, 1000);

  for (let i = 0; i < nullChunks.length; i++) {
    const ids = nullChunks[i]!;
    const res = await prisma.transferencia.updateMany({
      where: { id: { in: ids } },
      data: { dedupeKey: null },
    });
    console.log(`    null chunk ${i + 1}/${nullChunks.length}:`, res.count);
  }

  // 5) Aplica as novas chaves V2 (sem transaction longa)
  console.log("✍️ aplicando dedupeKey V2 (updates individuais em batches)...");
  const BATCH = 50;
  let done = 0;
  let failed = 0;

  for (let i = 0; i < toKeep.length; i += BATCH) {
    const slice = toKeep.slice(i, i + BATCH);

    // sequencial dentro do batch (mais confiável no Neon/pooler)
    for (const item of slice) {
      try {
        await prisma.transferencia.update({
          where: { id: item.id },
          data: { dedupeKey: item.key },
        });
        done++;
      } catch (e: any) {
        failed++;
        console.warn("⚠️ update falhou id=", item.id, "err=", e?.message ?? e);
      }
    }

    console.log(`   ⏳ progress: ${done}/${toKeep.length} (failed=${failed})`);
  }

  const totalAfter = await prisma.transferencia.count();
  const nullLeft = await prisma.transferencia.count({ where: { dedupeKey: null } });

  console.log(" DONE");
  console.log({
    totalBefore,
    totalAfter,
    willKeep: toKeep.length,
    willDelete: toDelete.length,
    updated: done,
    failed,
    nullLeft,
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ rekey v2 falhou:", e);
  process.exit(1);
});
