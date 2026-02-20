import { NextResponse } from "next/server";
import Papa from "papaparse";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const REQUIRED_HEADERS = [
  "atletaNome",
  "clubeOrigem",
  "clubeDestino",
  "dataTransferencia",
  "valor",
  "moeda",
] as const;

const OPTIONAL_HEADERS = [
  "atletaIdade",
  "atletaPosicao",
  "clubeFormador",
  "cidadeClubeFormador",
  "paisClubeFormador",
  "cidadeClubeDestino",
  "paisClubeDestino",
  "fonte",
] as const;

function normalizeHeader(h: string) {
  return h.trim();
}

function hasAllRequiredHeaders(headers: string[]) {
  const set = new Set(headers.map(normalizeHeader));
  return REQUIRED_HEADERS.every((h) => set.has(h));
}

function parseDateStrict(v: string) {
  const s = (v ?? "").trim();
  if (!s) throw new Error("dataTransferencia vazia");

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) throw new Error("dataTransferencia inválida");
    return d;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) throw new Error("dataTransferencia inválida");
    return d;
  }

  throw new Error("dataTransferencia deve ser YYYY-MM-DD ou DD/MM/YYYY");
}

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
  // remove moeda/símbolos/espaços, mantém dígitos e separadores
  s = s.replace(/[^\d,.\-]/g, "");
  // normaliza pt-BR (34.000.000,00 -> 34000000.00)
  s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

//  NOVA DEDUPE KEY (SEM DATA)
function makeDedupeKey(t: {
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
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function toNullableString(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

function toNullableInt(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, errors: ["Arquivo não enviado (field 'file')."] },
        { status: 400 },
      );
    }

    const csv = await file.text();

    const parsed = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      transformHeader: (h) => normalizeHeader(h.replace(/^"|"$/g, "")),
    });

    const headers = (parsed.meta.fields ?? []).map(normalizeHeader);

    if (!hasAllRequiredHeaders(headers)) {
      return NextResponse.json(
        {
          ok: false,
          errors: [
            "CSV inválido: faltando colunas obrigatórias.",
            `Obrigatórias: ${REQUIRED_HEADERS.join(", ")}`,
            `Recebido: ${headers.join(", ") || "(vazio)"}`,
          ],
        },
        { status: 400 },
      );
    }

    if (parsed.errors?.length) {
      return NextResponse.json(
        { ok: false, errors: parsed.errors.map((e) => e.message) },
        { status: 400 },
      );
    }

    const rows = parsed.data;
    const errors: string[] = [];

    const data = rows.map((r, idx) => {
      const atletaNome = String(r.atletaNome ?? "").trim();
      const clubeOrigem = toNullableString(r.clubeOrigem);
      const clubeDestino = toNullableString(r.clubeDestino);
      const dataTransferencia = parseDateStrict(String(r.dataTransferencia ?? ""));
      const moeda = toNullableString(r.moeda) ?? "EUR";
      const valorRaw = String(r.valor ?? "").trim();

      if (!atletaNome) errors.push(`Linha ${idx + 2}: atletaNome vazio`);
      if (!clubeOrigem) errors.push(`Linha ${idx + 2}: clubeOrigem vazio`);
      if (!clubeDestino) errors.push(`Linha ${idx + 2}: clubeDestino vazio`);
      if (!valorRaw) errors.push(`Linha ${idx + 2}: valor vazio`);

      const atletaIdade = toNullableInt(r.atletaIdade);
      const atletaPosicao = toNullableString(r.atletaPosicao);
      const clubeFormador = toNullableString(r.clubeFormador);

      const dedupeKey = makeDedupeKey({
        atletaNome,
        atletaIdade,
        atletaPosicao,
        clubeOrigem,
        clubeFormador,
        clubeDestino,
        valor: valorRaw,
        moeda,
      });

      return {
        atletaNome,
        atletaIdade,
        atletaPosicao,

        clubeFormador,
        cidadeClubeFormador: toNullableString(r.cidadeClubeFormador),
        paisClubeFormador: toNullableString(r.paisClubeFormador),

        clubeOrigem,
        clubeDestino,

        cidadeClubeDestino: toNullableString(r.cidadeClubeDestino),
        paisClubeDestino: toNullableString(r.paisClubeDestino),

        dataTransferencia,
        valor: moneyKey(valorRaw), // string "123.45"
        moeda,
        fonte: toNullableString(r.fonte),

        dedupeKey,
      };
    });

    if (errors.length) {
      return NextResponse.json(
        { ok: false, errors: errors.slice(0, 50) },
        { status: 400 },
      );
    }

    const res = await prisma.transferencia.createMany({
      data,
      skipDuplicates: true,
    });

    const inserted = res.count ?? 0;
    const skippedDuplicates = Math.max(0, data.length - inserted);

    return NextResponse.json({
      ok: true,
      parsed: data.length,
      inserted,
      skippedDuplicates,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, errors: [e?.message ?? "Erro interno"] },
      { status: 500 },
    );
  }
}
