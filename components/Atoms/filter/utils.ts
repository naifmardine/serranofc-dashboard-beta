import type { Jogador } from "@/type/jogador";

export const SERRANO_BLUE = "#003399";
export const SERRANO_YELLOW = "#F2CD00";

export const NONE_AGENCY = "__NONE_AGENCY__";

/* ========================= types ========================= */

export type RichOption = { label: string; logoUrl?: string };

export type JogadoresFilters = {
  clubes: string[];
  agencias: string[]; // pode conter NONE_AGENCY
  posicoes: string[];
  peDominante: string[];

  ageMode?: "idade" | "anoNascimento";

  // idade
  idadeMin?: number;
  idadeMax?: number;

  // ano nascimento
  anoNascimentoMin?: number;
  anoNascimentoMax?: number;

  // valorMercado (milhões EUR)
  valorMin?: number;
  valorMax?: number;
  valorSemDefinicao?: boolean;

  // % Serrano (possePct)
  posseMin?: number;
  posseMax?: number;
  posseSemDefinicao?: boolean;

  // altura (cm)
  alturaMin?: number;
  alturaMax?: number;
  alturaSemDefinicao?: boolean;

  // boolean pills (sim/nao). "não informado" conta como "não"
  cpfCadastrado?: "tem" | "nao_tem";
  passaporteEuropeu?: "sim" | "nao";
  convocadoSelecao?: "sim" | "nao";
};

export type OptionsModel = {
  clubesRich: RichOption[];
  agencias: string[];
  posicoes: string[];
  pes: string[];

  idadeMin: number;
  idadeMax: number;

  anoMin: number;
  anoMax: number;

  valorMin: number;
  valorMax: number;

  posseMin: number;
  posseMax: number;

  alturaMin: number;
  alturaMax: number;
};

/* ========================= utils ========================= */

export function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export function normStr(v: any) {
  return String(v ?? "").trim();
}

export function uniqSorted(arr: any[]) {
  return Array.from(new Set(arr.map((s) => normStr(s)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

// parse pt-BR number: "1.234,56" -> 1234.56 ; "12,5" -> 12.5 ; "10" -> 10
export function parsePtNumber(input: string): number | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  let s = raw.replace(/\s+/g, "");

  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  s = s.replace(/[^0-9.\-+]/g, "");

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function clampNum(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function formatMilhoes(n: number) {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function moneyEURfromMilhoes(milhoes: number) {
  if (!Number.isFinite(milhoes)) return "—";
  const eur = milhoes * 1_000_000;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

/* ========================= field getters ========================= */

export function normalizeAgency(v: any) {
  const s = normStr(v).toLowerCase();
  if (!s) return "";
  if (s === "—" || s === "-" || s === "n/a" || s === "na" || s === "null") return "";
  return normStr(v);
}

export function getAgency(j: any) {
  return normalizeAgency(j?.representacao);
}

export function getClubeNome(j: any) {
  const s = normStr(j?.clubeNome ?? j?.clube ?? j?.clubeRef?.nome);
  return s || "—";
}

export function getClubeLogoUrl(j: any) {
  const s = normStr(j?.clubeLogoUrl ?? j?.clubeRef?.logoUrl ?? j?.clubeLogo);
  return s || "";
}

export function getAnoNascimento(j: any) {
  const raw = (j as any)?.anoNascimento;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const yy = Math.trunc(n);
  if (yy < 1900 || yy > 2100) return null;
  return yy;
}

// bool “sim/nao” com regra: não informado => nao
export function toYesNoFromMaybe(v: any): "sim" | "nao" {
  const s = normStr(v).toLowerCase();
  if (!s) return "nao";
  if (s === "—" || s === "-" || s === "n/a" || s === "na" || s === "null") return "nao";
  if (["sim", "true", "1", "yes"].includes(s)) return "sim";
  return "nao";
}

export function hasCpf(j: any): boolean {
  const v = (j as any)?.cpf;
  const s = normStr(v);
  if (!s) return false;
  const digits = s.replace(/\D/g, "");
  return digits.length >= 11; // cpf completo
}

/* ========================= options builder ========================= */

export function buildFilterOptions(jogadores: Jogador[]): OptionsModel {
  const clubesMap = new Map<string, string>(); // nome -> logo

  for (const j of jogadores as any[]) {
    const nome = getClubeNome(j);
    const logo = getClubeLogoUrl(j);

    if (nome && nome !== "—" && !clubesMap.has(nome)) clubesMap.set(nome, logo);
    if (nome && nome !== "—" && logo && clubesMap.get(nome) === "") clubesMap.set(nome, logo);
  }

  const clubesRich: RichOption[] = Array.from(clubesMap.entries())
    .map(([label, logoUrl]) => ({ label, logoUrl }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  const agencias = uniqSorted(
    jogadores.map((j: any) => getAgency(j)).filter((a) => a.length > 0),
  );

  const posicoes = uniqSorted(jogadores.map((j: any) => normStr((j as any)?.posicao)));
  const pes = uniqSorted(jogadores.map((j: any) => normStr((j as any)?.peDominante)));

  const idades = jogadores
    .map((j: any) => Number((j as any)?.idade ?? 0))
    .filter((x) => Number.isFinite(x) && x > 0);

  const anosNasc = jogadores
    .map((j: any) => getAnoNascimento(j))
    .filter((x): x is number => typeof x === "number");

  const valores = jogadores
    .map((j: any) => Number((j as any)?.valorMercado ?? 0))
    .filter((x) => Number.isFinite(x) && x >= 0);

  const posses = jogadores
    .map((j: any) => Number((j as any)?.possePct))
    .filter((x) => Number.isFinite(x) && x >= 0 && x <= 100);

  const alturas = jogadores
    .map((j: any) => Number((j as any)?.altura))
    .filter((x) => Number.isFinite(x) && x > 0);

  const idadeMin = idades.length ? Math.min(...idades) : 0;
  const idadeMax = idades.length ? Math.max(...idades) : 0;

  const anoMin = anosNasc.length ? Math.min(...anosNasc) : 0;
  const anoMax = anosNasc.length ? Math.max(...anosNasc) : 0;

  const valorMin = valores.length ? Math.min(...valores) : 0;
  const valorMax = valores.length ? Math.max(...valores) : 0;

  const posseMin = posses.length ? Math.min(...posses) : 0;
  const posseMax = posses.length ? Math.max(...posses) : 100;

  const alturaMin = alturas.length ? Math.min(...alturas) : 0;
  const alturaMax = alturas.length ? Math.max(...alturas) : 0;

  return {
    clubesRich,
    agencias,
    posicoes,
    pes,
    idadeMin,
    idadeMax,
    anoMin,
    anoMax,
    valorMin,
    valorMax,
    posseMin,
    posseMax,
    alturaMin,
    alturaMax,
  };
}