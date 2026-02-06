// prisma/seed/transferencias.ts
import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

// =====================
// Helpers
// =====================
function normHeader(s: string) {
  return s
    .replace(/^\uFEFF/, "") // BOM
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // acentos
    .replace(/[^\w\s]/g, "") // pontuação
    .replace(/\s+/g, " ")
    .trim();
}

function splitLine(line: string, delimiter: "," | ";"): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((x) => x.trim());
}

function detectDelimiter(firstLine: string): "," | ";" {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function parseDateBR(input: string): Date | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) return iso;

  // dd/mm/yyyy ou dd/mm/yyyy hh:mm:ss
  const m = s.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const hh = m[4] ? Number(m[4]) : 0;
  const mi = m[5] ? Number(m[5]) : 0;
  const ss = m[6] ? Number(m[6]) : 0;

  const d = new Date(Date.UTC(yyyy, mm - 1, dd, hh, mi, ss));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMoney(input: string): Prisma.Decimal | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // seu CSV parece vir sem Mi/M, mas deixo robusto
  const isMillion = /mi\b/i.test(raw) || /\bm\b/i.test(raw);

  const cleaned = raw
    .replaceAll(".", "")
    .replace(/€|r\$|\$/gi, "")
    .replace(/mi\b/gi, "")
    .replace(/\bm\b/gi, "")
    .replaceAll(" ", "")
    .replaceAll(",", ".");

  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;

  const final = isMillion ? n * 1_000_000 : n;
  return new Prisma.Decimal(final);
}

// =====================
// Seed
// =====================
export async function seedTransferencias() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed de transferências bloqueado em produção.");
  }

  const file = path.join(
    process.cwd(),
    "data",
    "transferencias",
    "historico-transferencias.csv"
  );

  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV vazio ou sem header.");

  const delimiter = detectDelimiter(lines[0]);
  const header = splitLine(lines[0], delimiter).map(normHeader);

  const col = (names: string[]) => {
    for (const name of names) {
      const i = header.indexOf(normHeader(name));
      if (i !== -1) return i;
    }
    return -1;
  };

  // ✅ AGORA COM "transf" (do seu arquivo)
  const idx = {
    quantidade: col(["quantidade"]),
    nome: col(["nome", "atleta", "jogador"]),
    idade: col(["idade"]),
    posicao: col(["posicao", "posição"]),

    clubeFormador: col(["clube formador", "formador", "clubeformador"]),
    cidadeFormador: col(["cidade clube formador", "cidade formador"]),
    paisFormador: col(["pais clube formador", "país clube formador", "pais formador"]),

    clubeOrigem: col([
      "clube origem transf",
      "clube origem transferencia",
      "clube origem transferência",
      "clube origem",
      "origem",
    ]),
    clubeDestino: col([
      "clube destino transf",
      "clube destino transferencia",
      "clube destino transferência",
      "clube destino",
      "destino",
    ]),
    cidadeDestino: col([
      "cidade clube destino transf",
      "cidade clube destino transferencia",
      "cidade clube destino transferência",
      "cidade clube destino",
      "cidade destino",
    ]),
    paisDestino: col([
      "pais clube destino transf",
      "pais clube destino transferencia",
      "país clube destino transferência",
      "pais clube destino",
      "pais destino",
    ]),
    data: col([
      "data transf",
      "data transferencia",
      "data transferência",
      "data",
      "datatransferencia",
    ]),
    valor: col(["valor"]),
  };

  console.log("📌 CSV delimiter:", delimiter);
  console.log("📌 IDX:", idx);

  if (idx.nome === -1) throw new Error("Coluna de nome não encontrada.");

  // Agora tem que achar
  if (idx.clubeOrigem === -1 || idx.clubeDestino === -1 || idx.data === -1) {
    throw new Error(
      `Ainda não achei origem/destino/data. Header: ${JSON.stringify(header)}`
    );
  }

  await prisma.transferencia.deleteMany();

  const batch: Prisma.TransferenciaCreateManyInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitLine(lines[i], delimiter);

    const atletaNome = row[idx.nome]?.trim();
    if (!atletaNome) continue;

    const idadeRaw = idx.idade !== -1 ? row[idx.idade] : "";
    const idadeNum = idadeRaw ? Number(idadeRaw) : NaN;

    batch.push({
      atletaNome,
      atletaIdade: Number.isFinite(idadeNum) ? idadeNum : null,
      atletaPosicao: idx.posicao !== -1 ? row[idx.posicao] || null : null,

      clubeFormador:
        idx.clubeFormador !== -1 ? row[idx.clubeFormador] || null : null,
      cidadeClubeFormador:
        idx.cidadeFormador !== -1 ? row[idx.cidadeFormador] || null : null,
      paisClubeFormador:
        idx.paisFormador !== -1 ? row[idx.paisFormador] || null : null,

      clubeOrigem: row[idx.clubeOrigem] || null,
      clubeDestino: row[idx.clubeDestino] || null,
      cidadeClubeDestino:
        idx.cidadeDestino !== -1 ? row[idx.cidadeDestino] || null : null,
      paisClubeDestino:
        idx.paisDestino !== -1 ? row[idx.paisDestino] || null : null,

      dataTransferencia: parseDateBR(row[idx.data]),
      valor: idx.valor !== -1 ? parseMoney(row[idx.valor]) : null,

      fonte: "PowerBI Historico",
    });
  }

  const chunkSize = 500;
  for (let i = 0; i < batch.length; i += chunkSize) {
    await prisma.transferencia.createMany({
      data: batch.slice(i, i + chunkSize),
    });
  }

  console.log(`✅ Seed transferências: ${batch.length} registros importados.`);
}
