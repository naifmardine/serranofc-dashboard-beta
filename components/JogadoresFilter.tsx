"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import type { Jogador } from "@/type/jogador";

export type JogadoresFilters = {
  clubes: string[];
  agencias: string[]; // pode conter sentinel NONE_AGENCY
  posicoes: string[];
  peDominante: string[];
  idadeMin?: number;
  idadeMax?: number;
  valorMin?: number; // em milhões (mesma unidade do valorMercado)
  valorMax?: number; // em milhões
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
  if (s === "—" || s === "-" || s === "n/a" || s === "na" || s === "null")
    return "";
  return normStr(v);
}

function getAgency(j: any) {
  return normalizeAgency(j?.representacao);
}

function getClubeNome(j: any) {
  const s = normStr(j?.clubeNome ?? j?.clube);
  return s || "—";
}

/* ========================= MultiSelectSearch ========================= */

function MultiSelectSearch({
  label,
  placeholder = "Buscar...",
  options,
  selected,
  onChange,
  emptyLabel = "Nenhuma opção",
}: {
  label: string;
  placeholder?: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => o.toLowerCase().includes(qq));
  }, [q, options]);

  function toggle(item: string) {
    const exists = selected.includes(item);
    const next = exists ? selected.filter((x) => x !== item) : [...selected, item];
    onChange(next);
  }

  function remove(item: string) {
    onChange(selected.filter((x) => x !== item));
  }

  return (
    <div className="space-y-2" ref={wrapRef}>
      {!!label && <div className="text-sm font-semibold text-slate-900">{label}</div>}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "w-full rounded-xl border bg-white px-3 py-2 text-left",
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
                  "inline-flex items-center gap-1 rounded-full border",
                  "bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800",
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
                  className="rounded-full p-0.5 hover:bg-slate-200"
                  aria-label={`Remover ${s}`}
                >
                  <X size={12} />
                </span>
              </span>
            ))
          )}

          {selected.length > 3 && (
            <span className="text-xs text-slate-500 self-center">
              +{selected.length - 3}
            </span>
          )}
        </div>

        <ChevronDown
          size={16}
          className={cx("text-slate-500 transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="rounded-xl border bg-white shadow-lg">
          <div className="p-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="h-9 w-full rounded-lg border px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="max-h-[220px] overflow-auto p-2 pt-0">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-sm text-slate-500">{emptyLabel}</div>
            ) : (
              <div className="space-y-1">
                {filtered.map((opt) => {
                  const active = selected.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggle(opt)}
                      className={cx(
                        "w-full rounded-lg px-2 py-2 text-left text-sm",
                        "hover:bg-slate-50",
                        active && "bg-slate-100",
                      )}
                      title={opt}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{opt}</span>
                        <span
                          className={cx(
                            "text-xs font-semibold",
                            active ? "text-slate-900" : "text-slate-400",
                          )}
                        >
                          {active ? "Selecionado" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t p-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50"
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
    const clubes = uniqSorted(jogadores.map((j: any) => getClubeNome(j)));

    const agencias = uniqSorted(
      jogadores.map((j: any) => getAgency(j)).filter((a) => a.length > 0),
    );

    const posicoes = uniqSorted(jogadores.map((j: any) => normStr(j?.posicao)));
    const pes = uniqSorted(jogadores.map((j: any) => normStr(j?.peDominante)));

    const idades = jogadores
      .map((j: any) => Number(j?.idade ?? 0))
      .filter((x) => Number.isFinite(x) && x > 0);

    const valores = jogadores
      .map((j: any) => Number(j?.valorMercado ?? 0))
      .filter((x) => Number.isFinite(x) && x >= 0);

    const idadeMin = idades.length ? Math.min(...idades) : 0;
    const idadeMax = idades.length ? Math.max(...idades) : 0;
    const valorMin = valores.length ? Math.min(...valores) : 0;
    const valorMax = valores.length ? Math.max(...valores) : 0;

    return { clubes, agencias, posicoes, pes, idadeMin, idadeMax, valorMin, valorMax };
  }, [jogadores]);

  const [draft, setDraft] = useState<JogadoresFilters>(value);

  // inputs livres
  const [idadeMinTxt, setIdadeMinTxt] = useState("");
  const [idadeMaxTxt, setIdadeMaxTxt] = useState("");
  const [valorMinTxt, setValorMinTxt] = useState("");
  const [valorMaxTxt, setValorMaxTxt] = useState("");

  const [idadeErr, setIdadeErr] = useState<string | null>(null);
  const [valorErr, setValorErr] = useState<string | null>(null);

  // sync ao abrir / quando value mudar
  useEffect(() => {
    if (!open) return;

    setDraft(value);

    setIdadeMinTxt(value.idadeMin === undefined ? "" : String(value.idadeMin));
    setIdadeMaxTxt(value.idadeMax === undefined ? "" : String(value.idadeMax));

    setValorMinTxt(value.valorMin === undefined ? "" : formatMilhoes(value.valorMin));
    setValorMaxTxt(value.valorMax === undefined ? "" : formatMilhoes(value.valorMax));

    setIdadeErr(null);
    setValorErr(null);
  }, [open, value]);

  // esc fecha
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function toggleArr(key: keyof JogadoresFilters, item: string) {
    setDraft((prev) => {
      const arr = (prev[key] as string[]) ?? [];
      const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
      return { ...prev, [key]: next };
    });
  }

  function normalizeAgeFromText() {
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

    if (min !== undefined && max !== undefined && min > max) {
      [min, max] = [max, min];
    }

    setIdadeErr(error);
    setIdadeMinTxt(min === undefined ? "" : String(min));
    setIdadeMaxTxt(max === undefined ? "" : String(max));
    setDraft((prev) => ({ ...prev, idadeMin: min, idadeMax: max }));

    return { min, max, error };
  }

  function normalizeValorFromText() {
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

    if (min !== undefined && max !== undefined && min > max) {
      [min, max] = [max, min];
    }

    if (min !== undefined) min = Math.round(min * 100) / 100;
    if (max !== undefined) max = Math.round(max * 100) / 100;

    setValorErr(error);
    setValorMinTxt(min === undefined ? "" : formatMilhoes(min));
    setValorMaxTxt(max === undefined ? "" : formatMilhoes(max));
    setDraft((prev) => ({ ...prev, valorMin: min, valorMax: max }));

    return { min, max, error };
  }

  function clearAll() {
    setDraft({
      clubes: [],
      agencias: [],
      posicoes: [],
      peDominante: [],
      idadeMin: undefined,
      idadeMax: undefined,
      valorMin: undefined,
      valorMax: undefined,
    });
    setIdadeMinTxt("");
    setIdadeMaxTxt("");
    setValorMinTxt("");
    setValorMaxTxt("");
    setIdadeErr(null);
    setValorErr(null);
  }

  function apply() {
    const age = normalizeAgeFromText();
    const val = normalizeValorFromText();

    const nextDraft: JogadoresFilters = {
      ...draft,
      idadeMin: age.min,
      idadeMax: age.max,
      valorMin: val.min,
      valorMax: val.max,
    };

    // chama pai diretamente (sem setState durante render)
    onChange(nextDraft);
    setDraft(nextDraft);
    onOpenChange(false);
  }

  if (!open) return null;

  const hasNoneAgency = draft.agencias.includes(NONE_AGENCY);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => onOpenChange(false)}
      />

      <aside
        className={cx(
          "fixed right-0 top-0 z-50 h-full w-[380px] max-w-[94vw]",
          "bg-white shadow-2xl",
          "border-l border-slate-100",
          "rounded-l-2xl overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-slate-700" />
            <h3 className="text-base font-semibold text-slate-900">Filtros</h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl p-2 hover:bg-slate-50"
            aria-label="Fechar"
          >
            <X size={18} className="text-slate-700" />
          </button>
        </div>

        <div className="h-[calc(100%-132px)] overflow-y-auto px-4 py-4 space-y-5">
          {/* Idade */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-900">Idade</div>
            <div className="mb-3 text-xs text-slate-500">
              Intervalo disponível:{" "}
              <span className="font-semibold text-slate-700">
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

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setIdadeMinTxt("");
                  setIdadeMaxTxt("");
                  setIdadeErr(null);
                  setDraft((prev) => ({ ...prev, idadeMin: undefined, idadeMax: undefined }));
                }}
                className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                Limpar idade
              </button>

              <button
                type="button"
                onClick={() => {
                  setIdadeMinTxt(String(options.idadeMin));
                  setIdadeMaxTxt(String(options.idadeMax));
                  setIdadeErr(null);
                  setDraft((prev) => ({
                    ...prev,
                    idadeMin: options.idadeMin,
                    idadeMax: options.idadeMax,
                  }));
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                Usar range total
              </button>
            </div>
          </section>

          {/* Valor */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-900">Valor de mercado</div>
            <div className="mb-3 text-xs text-slate-500">
              Unidade: <span className="font-semibold text-slate-700">milhões (EUR)</span>{" "}
              — ex: <span className="font-semibold text-slate-700">2,5</span> ={" "}
              <span className="font-semibold text-slate-700">
                {moneyEURfromMilhoes(2.5)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-600">
                Min (mi)
                <input
                  inputMode="decimal"
                  value={valorMinTxt}
                  onChange={(e) => setValorMinTxt(e.target.value)}
                  onBlur={normalizeValorFromText}
                  placeholder={options.valorMin ? formatMilhoes(options.valorMin) : "0"}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="text-xs text-slate-600">
                Max (mi)
                <input
                  inputMode="decimal"
                  value={valorMaxTxt}
                  onChange={(e) => setValorMaxTxt(e.target.value)}
                  onBlur={normalizeValorFromText}
                  placeholder={options.valorMax ? formatMilhoes(options.valorMax) : "0"}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            {valorErr && <div className="mt-2 text-xs text-red-600">{valorErr}</div>}

            <div className="mt-2 text-[11px] text-slate-500">
              Intervalo atual:{" "}
              <span className="font-semibold text-slate-700">
                {draft.valorMin === undefined ? "—" : formatMilhoes(draft.valorMin)} mi
              </span>{" "}
              até{" "}
              <span className="font-semibold text-slate-700">
                {draft.valorMax === undefined ? "—" : formatMilhoes(draft.valorMax)} mi
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setValorMinTxt("");
                  setValorMaxTxt("");
                  setValorErr(null);
                  setDraft((prev) => ({ ...prev, valorMin: undefined, valorMax: undefined }));
                }}
                className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                Limpar valor
              </button>

              <button
                type="button"
                onClick={() => {
                  setValorMinTxt(formatMilhoes(options.valorMin));
                  setValorMaxTxt(formatMilhoes(options.valorMax));
                  setValorErr(null);
                  setDraft((prev) => ({
                    ...prev,
                    valorMin: options.valorMin,
                    valorMax: options.valorMax,
                  }));
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                Usar range total
              </button>
            </div>
          </section>

          {/* Posição */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-900">Posição</div>
            <div className="flex flex-wrap gap-2">
              {options.posicoes.slice(0, 40).map((p) => {
                const active = draft.posicoes.includes(p);
                return (
                  <button
                    key={p || "—"}
                    type="button"
                    onClick={() => toggleArr("posicoes", p)}
                    className={cx(
                      "rounded-full border px-3 py-1 text-xs transition",
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

          {/* Clube */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <MultiSelectSearch
              label="Clube"
              placeholder="Buscar clube…"
              options={options.clubes}
              selected={draft.clubes}
              onChange={(next) => setDraft((prev) => ({ ...prev, clubes: next }))}
              emptyLabel="Nenhum clube encontrado"
            />
          </section>

          {/* Agência + Sem agência */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Agência</div>

              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    agencias: prev.agencias.includes(NONE_AGENCY)
                      ? prev.agencias.filter((x) => x !== NONE_AGENCY)
                      : [...prev.agencias, NONE_AGENCY],
                  }))
                }
                className={cx(
                  "rounded-full border px-3 py-1 text-xs transition",
                  hasNoneAgency
                    ? "bg-[#f2cd00] border-[#f2cd00] text-black font-semibold"
                    : "border-slate-200 text-slate-800 hover:bg-slate-50",
                )}
              >
                Sem agência
              </button>
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

          {/* Pé dominante */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-900">Pé dominante</div>
            <div className="flex gap-2">
              {["D", "E", "A"].map((p) => {
                const active = draft.peDominante.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleArr("peDominante", p)}
                    className={cx(
                      "rounded-full border px-3 py-1 text-xs transition",
                      active
                        ? "bg-[#f2cd00] border-[#f2cd00] text-black font-semibold"
                        : "border-slate-200 text-slate-800 hover:bg-slate-50",
                    )}
                  >
                    {p === "D" ? "Direito" : p === "E" ? "Esquerdo" : "Ambos"}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="border-t border-slate-100 px-4 py-4 flex items-center justify-between gap-2 bg-white">
          <button
            type="button"
            onClick={clearAll}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-800 hover:bg-slate-50"
          >
            Limpar tudo
          </button>

          <button
            type="button"
            onClick={apply}
            className="h-10 rounded-xl bg-[#f2cd00] px-4 text-sm font-semibold text-black hover:brightness-95"
          >
            Aplicar
          </button>
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
