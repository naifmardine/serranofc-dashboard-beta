import crypto from "crypto";

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

function moneyKey(valor: unknown) {
  if (valor == null) return "";
  const s = String(valor).trim().replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toFixed(2);
}

export function makeTransferenciaDedupeKey(t: {
  atletaNome: string;
  clubeOrigem: string | null;
  clubeDestino: string | null;
  dataTransferencia: Date;
  valor: unknown;
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
