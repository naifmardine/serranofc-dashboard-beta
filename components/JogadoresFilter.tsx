"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import type { Jogador } from "@/type/jogador";

const SERRANO_BLUE = "#003399";
const SERRANO_YELLOW = "#F2CD00";

export type JogadoresFilters = {
  clubes: string[];
  agencias: string[]; // pode conter sentinel NONE_AGENCY
  posicoes: string[];
  peDominante: string[];

  // modo: filtrar por idade OU por anoNascimento
  ageMode?: "idade" | "anoNascimento";

  // idade
  idadeMin?: number;
  idadeMax?: number;

  // anoNascimento
  anoNascimentoMin?: number;
  anoNascimentoMax?: number;

  // valorMercado (milhões)
  valorMin?: number;
  valorMax?: number;

  // novo: apenas quem não tem valor (0/undefined/null)
  valorSemDefinicao?: boolean;
};

export const NONE_AGENCY = "__NONE_AGENCY__";

/* ========================= utils ========================= */

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function normStr(v: any) {
  return String(v ?? "").trim();
}

function uniqSorted(arr: any[]) {
  return Array.from(new Set(arr.map((s) => normStr(s)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

// parse pt-BR number: "1.234,56" -> 1234.56 ; "12,5" -> 12.5 ; "10" -> 10
function parsePtNumber(input: string): number | null {
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

function clampNum(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function formatMilhoes(n: number) {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function moneyEURfromMilhoes(milhoes: number) {
  if (!Number.isFinite(milhoes)) return "—";
  const eur = milhoes * 1_000_000;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

function normalizeAgency(v: any) {
  const s = normStr(v).toLowerCase();
  if (!s) return "";
  if (s === "—" || s === "-" || s === "n/a" || s === "na" || s === "null") return "";
  return normStr(v);
}

function getAgency(j: any) {
  return normalizeAgency(j?.representacao);
}

function getClubeNome(j: any) {
  const s = normStr(j?.clubeNome ?? j?.clube ?? j?.clubeRef?.nome);
  return s || "—";
}

function getClubeLogoUrl(j: any) {
  const s = normStr(j?.clubeLogoUrl ?? j?.clubeRef?.logoUrl ?? j?.clubeLogo);
  return s || "";
}

function getAnoNascimento(j: any) {
  const raw = (j as any)?.anoNascimento;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const yy = Math.trunc(n);
  if (yy < 1900 || yy > 2100) return null;
  return yy;
}

/* ========================= UI atoms ========================= */

function Pill({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx(
        "cursor-pointer rounded-full border px-3 py-1 text-xs transition",
        active
          ? "bg-[#f2cd00] border-[#f2cd00] text-black font-semibold"
          : "border-slate-200 text-slate-800 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

function PrimaryBlueButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "cursor-pointer h-10 rounded-xl px-4 text-sm font-extrabold text-white transition",
        "disabled:opacity-60 disabled:cursor-not-allowed",
      )}
      style={{ backgroundColor: SERRANO_BLUE }}
    >
      {children}
    </button>
  );
}

function SecondaryBlueButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx(
        "cursor-pointer h-10 rounded-xl border px-3 text-sm font-semibold transition",
        "hover:bg-slate-50",
      )}
      style={{ borderColor: `${SERRANO_BLUE}40`, color: SERRANO_BLUE }}
    >
      {children}
    </button>
  );
}

/* ========================= MultiSelectSearch ========================= */

type RichOption = { label: string; logoUrl?: string };

function MultiSelectSearch({
  label,
  placeholder = "Buscar...",
  options,
  selected,
  onChange,
  emptyLabel = "Nenhuma opção",
  renderOption,
}: {
  label: string;
  placeholder?: string;
  options: string[] | RichOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel?: string;
  renderOption?: (opt: RichOption, active: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const asRich: RichOption[] = useMemo(() => {
    if (options.length === 0) return [];
    if (typeof (options as any)[0] === "string") {
      return (options as string[]).map((s) => ({ label: s }));
    }
    return options as RichOption[];
  }, [options]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return asRich;
    return asRich.filter((o) => o.label.toLowerCase().includes(qq));
  }, [q, asRich]);

  const toggle = (labelValue: string) => {
    const exists = selected.includes(labelValue);
    const next = exists ? selected.filter((x) => x !== labelValue) : [...selected, labelValue];
    onChange(next);
  };

  const remove = (labelValue: string) => {
    onChange(selected.filter((x) => x !== labelValue));
  };

  return (
    <div className="space-y-2" ref={wrapRef}>
      {!!label && <div className="text-sm font-extrabold text-slate-900">{label}</div>}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left",
          "shadow-sm hover:bg-slate-50",
          "flex items-center justify-between gap-2",
        )}
      >
        <div className="flex flex-wrap gap-2">
          {selected.length === 0 ? (
            <span className="text-sm text-slate-500">Selecionar…</span>
          ) : (
            selected.slice(0, 3).map((s) => (
              <span
                key={s}
                className={cx(
                  "inline-flex items-center gap-1 rounded-full border border-slate-200",
                  "bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-800",
                )}
                title={s}
              >
                <span className="max-w-[140px] truncate">{s}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(s);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(s);
                    }
                  }}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-slate-200"
                  aria-label={`Remover ${s}`}
                >
                  <X size={12} />
                </span>
              </span>
            ))
          )}

          {selected.length > 3 && (
            <span className="text-xs text-slate-500 self-center">+{selected.length - 3}</span>
          )}
        </div>

        <ChevronDown
          size={16}
          className={cx("text-slate-500 transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="max-h-60 overflow-auto p-2 pt-0">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-sm text-slate-500">{emptyLabel}</div>
            ) : (
              <div className="space-y-1">
                {filtered.map((opt) => {
                  const active = selected.includes(opt.label);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => toggle(opt.label)}
                      className={cx(
                        "w-full cursor-pointer rounded-xl px-2 py-2 text-left text-sm",
                        "hover:bg-slate-50",
                        active && "bg-slate-100",
                      )}
                      title={opt.label}
                    >
                      {renderOption ? (
                        renderOption(opt, active)
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{opt.label}</span>
                          <span className={cx("text-xs font-extrabold", active ? "text-slate-900" : "text-slate-400")}>
                            {active ? "Selecionado" : ""}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 p-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="cursor-pointer rounded-xl px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-xl px-2 py-1 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================= Drawer ========================= */

export default function JogadoresFilterDrawer({
  open,
  onOpenChange,
  jogadores,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jogadores: Jogador[];
  value: JogadoresFilters;
  onChange: (v: JogadoresFilters) => void;
}) {
  const options = useMemo(() => {
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

    const idadeMin = idades.length ? Math.min(...idades) : 0;
    const idadeMax = idades.length ? Math.max(...idades) : 0;

    const anoMin = anosNasc.length ? Math.min(...anosNasc) : 0;
    const anoMax = anosNasc.length ? Math.max(...anosNasc) : 0;

    const valorMin = valores.length ? Math.min(...valores) : 0;
    const valorMax = valores.length ? Math.max(...valores) : 0;

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
    };
  }, [jogadores]);

  const [draft, setDraft] = useState<JogadoresFilters>(() => ({
    ...value,
    ageMode: value.ageMode ?? "idade",
    valorSemDefinicao: value.valorSemDefinicao ?? false,
  }));

  // inputs
  const [idadeMinTxt, setIdadeMinTxt] = useState("");
  const [idadeMaxTxt, setIdadeMaxTxt] = useState("");
  const [anoMinTxt, setAnoMinTxt] = useState("");
  const [anoMaxTxt, setAnoMaxTxt] = useState("");
  const [valorMinTxt, setValorMinTxt] = useState("");
  const [valorMaxTxt, setValorMaxTxt] = useState("");

  const [idadeErr, setIdadeErr] = useState<string | null>(null);
  const [anoErr, setAnoErr] = useState<string | null>(null);
  const [valorErr, setValorErr] = useState<string | null>(null);

  // sync ao abrir
  useEffect(() => {
    if (!open) return;

    const next: JogadoresFilters = {
      ...value,
      ageMode: value.ageMode ?? "idade",
      valorSemDefinicao: value.valorSemDefinicao ?? false,
    };
    setDraft(next);

    setIdadeMinTxt(next.idadeMin === undefined ? "" : String(next.idadeMin));
    setIdadeMaxTxt(next.idadeMax === undefined ? "" : String(next.idadeMax));
    setAnoMinTxt(next.anoNascimentoMin === undefined ? "" : String(next.anoNascimentoMin));
    setAnoMaxTxt(next.anoNascimentoMax === undefined ? "" : String(next.anoNascimentoMax));
    setValorMinTxt(next.valorMin === undefined ? "" : formatMilhoes(next.valorMin));
    setValorMaxTxt(next.valorMax === undefined ? "" : formatMilhoes(next.valorMax));

    setIdadeErr(null);
    setAnoErr(null);
    setValorErr(null);
  }, [open, value]);

  // ESC fecha (resolve Sourcery: sem function decl em bloco)
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const hasNoneAgency = draft.agencias.includes(NONE_AGENCY);

  const setAgeMode = (mode: "idade" | "anoNascimento") => {
    setDraft((prev) => ({
      ...prev,
      ageMode: mode,
      ...(mode === "idade"
        ? { anoNascimentoMin: undefined, anoNascimentoMax: undefined }
        : { idadeMin: undefined, idadeMax: undefined }),
    }));
    setIdadeErr(null);
    setAnoErr(null);
  };

  const toggleArr = (key: keyof JogadoresFilters, item: string) => {
    setDraft((prev) => {
      const arr = (prev[key] as string[]) ?? [];
      const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
      return { ...prev, [key]: next };
    });
  };

  const normalizeAgeFromText = () => {
    const hardMin = options.idadeMin ?? 0;
    const hardMax = options.idadeMax ?? 0;

    let error: string | null = null;

    const minRaw = parsePtNumber(idadeMinTxt);
    const maxRaw = parsePtNumber(idadeMaxTxt);

    if (idadeMinTxt.trim() && minRaw === null) error = "Idade mínima inválida.";
    if (idadeMaxTxt.trim() && maxRaw === null) error = "Idade máxima inválida.";

    let min = minRaw === null ? undefined : Math.trunc(minRaw);
    let max = maxRaw === null ? undefined : Math.trunc(maxRaw);

    if (min !== undefined) min = clampNum(min, hardMin, hardMax);
    if (max !== undefined) max = clampNum(max, hardMin, hardMax);
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

    setIdadeErr(error);
    setIdadeMinTxt(min === undefined ? "" : String(min));
    setIdadeMaxTxt(max === undefined ? "" : String(max));
    setDraft((prev) => ({ ...prev, idadeMin: min, idadeMax: max }));

    return { min, max, error };
  };

  const normalizeAnoFromText = () => {
    const hardMin = options.anoMin ?? 0;
    const hardMax = options.anoMax ?? 0;

    let error: string | null = null;

    const minRaw = parsePtNumber(anoMinTxt);
    const maxRaw = parsePtNumber(anoMaxTxt);

    if (anoMinTxt.trim() && minRaw === null) error = "Ano mínimo inválido.";
    if (anoMaxTxt.trim() && maxRaw === null) error = "Ano máximo inválido.";

    let min = minRaw === null ? undefined : Math.trunc(minRaw);
    let max = maxRaw === null ? undefined : Math.trunc(maxRaw);

    if (hardMin && hardMax) {
      if (min !== undefined) min = clampNum(min, hardMin, hardMax);
      if (max !== undefined) max = clampNum(max, hardMin, hardMax);
    }

    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

    setAnoErr(error);
    setAnoMinTxt(min === undefined ? "" : String(min));
    setAnoMaxTxt(max === undefined ? "" : String(max));
    setDraft((prev) => ({ ...prev, anoNascimentoMin: min, anoNascimentoMax: max }));

    return { min, max, error };
  };

  const normalizeValorFromText = () => {
    const hardMin = options.valorMin ?? 0;
    const hardMax = options.valorMax ?? 0;

    let error: string | null = null;

    const minRaw = parsePtNumber(valorMinTxt);
    const maxRaw = parsePtNumber(valorMaxTxt);

    if (valorMinTxt.trim() && minRaw === null) error = "Valor mínimo inválido. Ex: 2,5";
    if (valorMaxTxt.trim() && maxRaw === null) error = "Valor máximo inválido. Ex: 10";

    let min = minRaw === null ? undefined : minRaw;
    let max = maxRaw === null ? undefined : maxRaw;

    if (min !== undefined) min = clampNum(min, hardMin, hardMax);
    if (max !== undefined) max = clampNum(max, hardMin, hardMax);
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

    if (min !== undefined) min = Math.round(min * 100) / 100;
    if (max !== undefined) max = Math.round(max * 100) / 100;

    setValorErr(error);
    setValorMinTxt(min === undefined ? "" : formatMilhoes(min));
    setValorMaxTxt(max === undefined ? "" : formatMilhoes(max));
    setDraft((prev) => ({ ...prev, valorMin: min, valorMax: max }));

    return { min, max, error };
  };

  const toggleValorSemDefinicao = () => {
    setDraft((prev) => {
      const next = !(prev.valorSemDefinicao ?? false);

      if (next) {
        // liga "sem valor" => limpa range pra evitar conflito
        setValorMinTxt("");
        setValorMaxTxt("");
        setValorErr(null);
        return { ...prev, valorSemDefinicao: true, valorMin: undefined, valorMax: undefined };
      }

      return { ...prev, valorSemDefinicao: false };
    });
  };

  const clearAll = () => {
    setDraft({
      clubes: [],
      agencias: [],
      posicoes: [],
      peDominante: [],
      ageMode: "idade",
      idadeMin: undefined,
      idadeMax: undefined,
      anoNascimentoMin: undefined,
      anoNascimentoMax: undefined,
      valorMin: undefined,
      valorMax: undefined,
      valorSemDefinicao: false,
    });

    setIdadeMinTxt("");
    setIdadeMaxTxt("");
    setAnoMinTxt("");
    setAnoMaxTxt("");
    setValorMinTxt("");
    setValorMaxTxt("");

    setIdadeErr(null);
    setAnoErr(null);
    setValorErr(null);
  };

  const apply = () => {
    const mode = draft.ageMode ?? "idade";

    const age = mode === "idade" ? normalizeAgeFromText() : { min: undefined, max: undefined, error: null };
    const by = mode === "anoNascimento" ? normalizeAnoFromText() : { min: undefined, max: undefined, error: null };

    const val = draft.valorSemDefinicao
      ? { min: undefined, max: undefined, error: null }
      : normalizeValorFromText();

    const nextDraft: JogadoresFilters = {
      ...draft,
      ageMode: mode,

      idadeMin: mode === "idade" ? age.min : undefined,
      idadeMax: mode === "idade" ? age.max : undefined,

      anoNascimentoMin: mode === "anoNascimento" ? by.min : undefined,
      anoNascimentoMax: mode === "anoNascimento" ? by.max : undefined,

      valorMin: draft.valorSemDefinicao ? undefined : val.min,
      valorMax: draft.valorSemDefinicao ? undefined : val.max,
    };

    onChange(nextDraft);
    setDraft(nextDraft);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/25"
        onClick={() => onOpenChange(false)}
        aria-label="Fechar filtros"
      />

      <aside
        className={cx(
          "fixed right-0 top-0 z-50 h-full w-[440px] max-w-[94vw]",
          "bg-white shadow-2xl border-l border-slate-100",
          "rounded-l-2xl overflow-hidden",
        )}
      >
        {/* Header */}
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl border"
                style={{
                  backgroundColor: `${SERRANO_BLUE}10`,
                  borderColor: `${SERRANO_BLUE}20`,
                }}
              >
                <SlidersHorizontal size={16} style={{ color: SERRANO_BLUE }} />
              </span>

              <div>
                <div className="text-sm font-extrabold text-slate-900">Filtros</div>
                <div className="text-xs text-slate-500">Refine sua lista de jogadores</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer rounded-xl p-2 hover:bg-slate-50"
              aria-label="Fechar"
              title="Fechar"
            >
              <X size={18} className="text-slate-700" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-132px)] overflow-y-auto px-4 py-4 space-y-5">
          {/* ===== Idade / Ano Nasc. ===== */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">Faixa</div>

              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setAgeMode("idade")}
                  className={cx(
                    "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-extrabold transition",
                    (draft.ageMode ?? "idade") === "idade"
                      ? "text-black"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                  style={(draft.ageMode ?? "idade") === "idade" ? { backgroundColor: SERRANO_YELLOW } : undefined}
                >
                  Idade
                </button>

                <button
                  type="button"
                  onClick={() => setAgeMode("anoNascimento")}
                  className={cx(
                    "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-extrabold transition",
                    (draft.ageMode ?? "idade") === "anoNascimento"
                      ? "text-black"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                  style={(draft.ageMode ?? "idade") === "anoNascimento" ? { backgroundColor: SERRANO_YELLOW } : undefined}
                >
                  Ano Nasc.
                </button>
              </div>
            </div>

            {(draft.ageMode ?? "idade") === "idade" ? (
              <>
                <div className="mb-3 text-xs text-slate-500">
                  Range:{" "}
                  <span className="font-extrabold text-slate-700">
                    {options.idadeMin}–{options.idadeMax}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-600">
                    Min
                    <input
                      inputMode="numeric"
                      value={idadeMinTxt}
                      onChange={(e) => setIdadeMinTxt(e.target.value)}
                      onBlur={normalizeAgeFromText}
                      placeholder={String(options.idadeMin)}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  <label className="text-xs text-slate-600">
                    Max
                    <input
                      inputMode="numeric"
                      value={idadeMaxTxt}
                      onChange={(e) => setIdadeMaxTxt(e.target.value)}
                      onBlur={normalizeAgeFromText}
                      placeholder={String(options.idadeMax)}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                </div>

                {idadeErr && <div className="mt-2 text-xs text-red-600">{idadeErr}</div>}
              </>
            ) : (
              <>
                <div className="mb-3 text-xs text-slate-500">
                  Range:{" "}
                  <span className="font-extrabold text-slate-700">
                    {options.anoMin || "—"}–{options.anoMax || "—"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-600">
                    Min
                    <input
                      inputMode="numeric"
                      value={anoMinTxt}
                      onChange={(e) => setAnoMinTxt(e.target.value)}
                      onBlur={normalizeAnoFromText}
                      placeholder={options.anoMin ? String(options.anoMin) : "Ex: 2001"}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  <label className="text-xs text-slate-600">
                    Max
                    <input
                      inputMode="numeric"
                      value={anoMaxTxt}
                      onChange={(e) => setAnoMaxTxt(e.target.value)}
                      onBlur={normalizeAnoFromText}
                      placeholder={options.anoMax ? String(options.anoMax) : "Ex: 2007"}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                </div>

                {anoErr && <div className="mt-2 text-xs text-red-600">{anoErr}</div>}
              </>
            )}
          </section>

          {/* ===== Valor de mercado (Sem valor) ===== */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">Valor de mercado</div>

              <Pill
                active={!!draft.valorSemDefinicao}
                onClick={toggleValorSemDefinicao}
                title="Filtrar apenas jogadores com valorMercado = 0 ou sem valor"
              >
                Sem valor
              </Pill>
            </div>

            <div className="mb-3 text-xs text-slate-500">
              Unidade: <span className="font-extrabold text-slate-700">milhões (EUR)</span>{" "}
              — ex: <span className="font-extrabold text-slate-700">2,5</span> ={" "}
              <span className="font-extrabold text-slate-700">{moneyEURfromMilhoes(2.5)}</span>
            </div>

            <div className={cx("grid grid-cols-2 gap-2", draft.valorSemDefinicao && "opacity-60")}>
              <label className="text-xs text-slate-600">
                Min (mi)
                <input
                  disabled={!!draft.valorSemDefinicao}
                  inputMode="decimal"
                  value={valorMinTxt}
                  onChange={(e) => setValorMinTxt(e.target.value)}
                  onBlur={normalizeValorFromText}
                  placeholder={options.valorMin ? formatMilhoes(options.valorMin) : "0"}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </label>

              <label className="text-xs text-slate-600">
                Max (mi)
                <input
                  disabled={!!draft.valorSemDefinicao}
                  inputMode="decimal"
                  value={valorMaxTxt}
                  onChange={(e) => setValorMaxTxt(e.target.value)}
                  onBlur={normalizeValorFromText}
                  placeholder={options.valorMax ? formatMilhoes(options.valorMax) : "0"}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </label>
            </div>

            {!draft.valorSemDefinicao && valorErr && (
              <div className="mt-2 text-xs text-red-600">{valorErr}</div>
            )}
          </section>

          {/* ===== Posição ===== */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-extrabold text-slate-900">Posição</div>
            <div className="flex flex-wrap gap-2">
              {options.posicoes.slice(0, 40).map((p) => {
                const active = draft.posicoes.includes(p);
                return (
                  <button
                    key={p || "—"}
                    type="button"
                    onClick={() => toggleArr("posicoes", p)}
                    className={cx(
                      "cursor-pointer rounded-full border px-3 py-1 text-xs transition",
                      active
                        ? "bg-[#f2cd00] border-[#f2cd00] text-black font-semibold"
                        : "border-slate-200 text-slate-800 hover:bg-slate-50",
                    )}
                    title={p}
                  >
                    {p || "—"}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ===== Clube (logo + nome no dropdown) ===== */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <MultiSelectSearch
              label="Clube"
              placeholder="Buscar clube…"
              options={options.clubesRich}
              selected={draft.clubes}
              onChange={(next) => setDraft((prev) => ({ ...prev, clubes: next }))}
              emptyLabel="Nenhum clube encontrado"
              renderOption={(opt, active) => (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full border border-slate-200 bg-white overflow-hidden grid place-items-center shrink-0">
                      {opt.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={opt.logoUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <div className="h-full w-full bg-slate-100" />
                      )}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>

                  <span className={cx("text-xs font-extrabold", active ? "text-slate-900" : "text-slate-400")}>
                    {active ? "Selecionado" : ""}
                  </span>
                </div>
              )}
            />
          </section>

          {/* ===== Agência + Sem agência ===== */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">Agência</div>

              <Pill
                active={hasNoneAgency}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    agencias: prev.agencias.includes(NONE_AGENCY)
                      ? prev.agencias.filter((x) => x !== NONE_AGENCY)
                      : [...prev.agencias, NONE_AGENCY],
                  }))
                }
              >
                Sem agência
              </Pill>
            </div>

            <MultiSelectSearch
              label=""
              placeholder="Buscar agência…"
              options={options.agencias}
              selected={draft.agencias.filter((x) => x !== NONE_AGENCY)}
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  agencias: [
                    ...next,
                    ...(prev.agencias.includes(NONE_AGENCY) ? [NONE_AGENCY] : []),
                  ],
                }))
              }
              emptyLabel="Nenhuma agência encontrada"
            />
          </section>

          {/* ===== Pé dominante (padronizado com Pill) ===== */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-extrabold text-slate-900">Pé dominante</div>
            <div className="flex gap-2">
              {[
                { key: "D", label: "Direito" },
                { key: "E", label: "Esquerdo" },
              ].map((p) => (
                <Pill
                  key={p.key}
                  active={draft.peDominante.includes(p.key)}
                  onClick={() => toggleArr("peDominante", p.key)}
                >
                  {p.label}
                </Pill>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-4 flex items-center justify-between gap-2 bg-white">
          <SecondaryBlueButton onClick={clearAll}>Limpar tudo</SecondaryBlueButton>

          <PrimaryBlueButton onClick={apply}>Aplicar</PrimaryBlueButton>
        </div>

        <style jsx>{`
          aside {
            animation: slideIn 160ms ease-out;
          }
          @keyframes slideIn {
            from {
              transform: translateX(12px);
              opacity: 0.7;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>
      </aside>
    </>
  );
}
