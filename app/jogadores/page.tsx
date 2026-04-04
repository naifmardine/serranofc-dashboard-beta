"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";

import PageTitle from "@/components/Atoms/PageTitle";
import Card from "@/components/Card";
import PlayerRow from "@/components/PlayerRow";
import JogadoresFilterDrawer from "@/components/JogadoresFilter";
import { NONE_AGENCY, type JogadoresFilters } from "@/components/Atoms/filter/utils";
import type { Jogador } from "@/type/jogador";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";

import ExportPrintButton from "@/components/ExportPrintButton";
import { useDashboardPdfExport } from "@/hooks/useDashboardPdfExport";
import { useI18n } from "@/contexts/I18nContext";

/* =========================
   Error boundary
========================= */
function ErrorFallback({ err }: { err?: any }) {
  const { t } = useI18n();
  return (
    <section className="w-full bg-gray-50 p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 font-bold">{t.jogadores.erroCarregar}</h3>
        <pre className="whitespace-pre-wrap wrap-break-word text-xs text-red-800">
          {String(err?.message ?? err ?? t.jogadores.erroDesconhecido)}
        </pre>
      </div>
    </section>
  );
}

class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; err?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, err: undefined };
  }

  static getDerivedStateFromError(err: any) {
    return { hasError: true, err };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback err={this.state.err} />;
    }
    return this.props.children;
  }
}

/* =========================
   Helpers
========================= */

type View = "grid" | "list";
type AgeMode = "idade" | "anoNascimento";

function normStr(v: any) {
  return String(v ?? "").trim();
}

function onlyDigits(v: any) {
  return String(v ?? "").replace(/\D/g, "");
}

function normalizeAgency(v: any) {
  const s = normStr(v).toLowerCase();
  if (!s) return "";
  if (s === "—" || s === "-" || s === "n/a" || s === "na" || s === "null") return "";
  return normStr(v);
}

function normalizeClub(j: any) {
  const s = normStr(j?.clubeNome ?? j?.clube);
  return s || "—";
}

function safeNumber(v: any): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function agencyMatches(j: any, selected: string[]) {
  if (!selected || selected.length === 0) return true;

  const agency = normalizeAgency(j?.representacao);
  const hasAgency = agency.length > 0;

  const wantsNone = selected.includes(NONE_AGENCY);
  const selectedAgencies = selected.filter((x) => x !== NONE_AGENCY);

  if (wantsNone && selectedAgencies.length === 0) return !hasAgency;

  if (wantsNone) {
    return !hasAgency || (hasAgency && selectedAgencies.includes(agency));
  }

  return hasAgency && selectedAgencies.includes(agency);
}

/**
 * FILTRO ÚNICO E FIEL AO DRAWER (inclui NOVOS filtros)
 */
function applyJogadoresFilters(players: Jogador[], f: JogadoresFilters) {
  const ageMode: AgeMode = ((f as any).ageMode as AgeMode) ?? "idade";

  const { idadeMin, idadeMax } = f as any;
  const anoMin = (f as any).anoNascimentoMin;
  const anoMax = (f as any).anoNascimentoMax;

  const { valorMin, valorMax } = f as any;
  const valorSemDefinicao = Boolean((f as any).valorSemDefinicao);

  const {posseMin, posseMax} = f as any;
  const posseSemDefinicao = Boolean((f as any).posseSemDefinicao);

  const {alturaMin, alturaMax} = f as any;
  const alturaSemDefinicao = Boolean((f as any).alturaSemDefinicao);

  const cpfCadastrado = (f as any).cpfCadastrado as "tem" | "nao_tem" | undefined;
  const passaporteEuropeu = (f as any).passaporteEuropeu as "sim" | "nao" | undefined;
  const convocadoSelecao = (f as any).convocadoSelecao as "sim" | "nao" | undefined;

  return players.filter((j: any) => {
    const clubeNome = normalizeClub(j);
    if (f.clubes?.length && !f.clubes.includes(clubeNome)) return false;

    if (!agencyMatches(j, f.agencias ?? [])) return false;

    const pos = normStr(j?.posicao);
    if (f.posicoes?.length && !f.posicoes.includes(pos)) return false;

    const pe = normStr(j?.peDominante);
    if (f.peDominante?.length && !f.peDominante.includes(pe)) return false;

    // ===== CPF cadastrado (tem/nao_tem) =====
    if (cpfCadastrado) {
      const cpfDigits = onlyDigits(j?.cpf);
      const hasCpf = cpfDigits.length === 11;
      if (cpfCadastrado === "tem" && !hasCpf) return false;
      if (cpfCadastrado === "nao_tem" && hasCpf) return false;
    }

    // ===== Passaporte europeu (sim/nao). "nao" inclui null/undefined =====
    if (passaporteEuropeu) {
      const isEu = j?.passaporte?.europeu === true;
      if (passaporteEuropeu === "sim" && !isEu) return false;
      if (passaporteEuropeu === "nao" && isEu) return false;
    }

    // ===== Convocado seleção (sim/nao). "nao" inclui null/undefined =====
    if (convocadoSelecao) {
      const isConv = j?.selecao?.convocado === true;
      if (convocadoSelecao === "sim" && !isConv) return false;
      if (convocadoSelecao === "nao" && isConv) return false;
    }

    // ===== Idade / Ano Nascimento =====
    if (ageMode === "idade") {
      const idade = safeNumber(j?.idade);
      const v = idade ?? 0;
      if (typeof idadeMin === "number" && v < idadeMin) return false;
      if (typeof idadeMax === "number" && v > idadeMax) return false;
    } else {
      const ano = safeNumber(j?.anoNascimento);
      if (ano == null) return false;
      if (typeof anoMin === "number" && ano < anoMin) return false;
      if (typeof anoMax === "number" && ano > anoMax) return false;
    }

    // ===== Valor Mercado =====
    const valor = safeNumber(j?.valorMercado);
    if (valorSemDefinicao) {
      if (valor != null && valor > 0) return false;
    } else {
      const v = valor ?? 0;
      if (typeof valorMin === "number" && v < valorMin) return false;
      if (typeof valorMax === "number" && v > valorMax) return false;
    }

    // ===== Posse % =====
    const posse = safeNumber(j?.possePct);
    if (posseSemDefinicao) {
      if (posse != null) return false;
    } else {
      const hasRange = typeof posseMin === "number" || typeof posseMax === "number";
      if (hasRange) {
        if (posse == null) return false;
        if (typeof posseMin === "number" && posse < posseMin) return false;
        if (typeof posseMax === "number" && posse > posseMax) return false;
      }
    }

    // ===== Altura =====
    const altura = safeNumber(j?.altura);
    if (alturaSemDefinicao) {
      if (altura != null && altura > 0) return false;
    } else {
      const hasRange = typeof alturaMin === "number" || typeof alturaMax === "number";
      if (hasRange) {
        if (altura == null || altura <= 0) return false;
        if (typeof alturaMin === "number" && altura < alturaMin) return false;
        if (typeof alturaMax === "number" && altura > alturaMax) return false;
      }
    }

    return true;
  });
}

/* =========================
   Defaults
========================= */

const EMPTY_FILTERS: JogadoresFilters = {
  clubes: [],
  agencias: [],
  posicoes: [],
  peDominante: [],

  idadeMin: undefined,
  idadeMax: undefined,
  valorMin: undefined,
  valorMax: undefined,
  ageMode: "idade",
  anoNascimentoMin: undefined,
  anoNascimentoMax: undefined,
  valorSemDefinicao: false,

  // novos
  posseMin: undefined,
  posseMax: undefined,
  posseSemDefinicao: false,

  alturaMin: undefined,
  alturaMax: undefined,
  alturaSemDefinicao: false,

  cpfCadastrado: undefined,
  passaporteEuropeu: undefined,
  convocadoSelecao: undefined,
};

export default function JogadoresPage() {
  const { t } = useI18n();
  const [view, setView] = useState<View>("grid");
  const [data, setData] = useState<Jogador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<JogadoresFilters>(EMPTY_FILTERS);

  // EXPORT
  const { exportRef, exportPdf, exporting, error: exportError } = useDashboardPdfExport();

  const jogadores = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filtered = useMemo(() => applyJogadoresFilters(jogadores, filters), [jogadores, filters]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;

    if (filters.clubes?.length) n++;
    if (filters.agencias?.length) n++;
    if (filters.posicoes?.length) n++;
    if (filters.peDominante?.length) n++;

    const ageMode: AgeMode = ((filters as any).ageMode as AgeMode) ?? "idade";
    if (ageMode === "idade") {
          if (typeof (filters as any).idadeMin === "number" || typeof (filters as any).idadeMax === "number") n++;
        }
    else if (typeof (filters as any).anoNascimentoMin === "number" || typeof (filters as any).anoNascimentoMax === "number") n++;

    const semValor = Boolean((filters as any).valorSemDefinicao);
    if (semValor) n++;
    else if (typeof (filters as any).valorMin === "number" || typeof (filters as any).valorMax === "number") n++;

    const semPosse = Boolean((filters as any).posseSemDefinicao);
    if (semPosse) n++;
    else if (typeof (filters as any).posseMin === "number" || typeof (filters as any).posseMax === "number") n++;

    const semAltura = Boolean((filters as any).alturaSemDefinicao);
    if (semAltura) n++;
    else if (typeof (filters as any).alturaMin === "number" || typeof (filters as any).alturaMax === "number") n++;

    if ((filters as any).cpfCadastrado) n++;
    if ((filters as any).passaporteEuropeu) n++;
    if ((filters as any).convocadoSelecao) n++;

    return n;
  }, [filters]);

  const handleExport = useCallback(() => {
    void exportPdf({
      filename: `jogadores-${view}-${new Date().toISOString().slice(0, 10)}.pdf`,
      format: "a4",
      orientation: "portrait",
      marginMm: 8,
      scale: 2,
      blockSelector: `[data-pdf-block="true"]`,
      header: {
        title: t.jogadores.title,
        subtitle: `${t.jogadores.modo}: ${view} • ${t.jogadores.filtrosLabel}: ${activeFiltersCount} • ${t.jogadores.mostrando}: ${filtered.length}`,
        rightText: new Date().toISOString().slice(0, 10),
      },
      footer: {
        leftText: t.sidebar.serranFC,
        pageLabel: t.pdfExport.pagina,
        ofLabel: t.pdfExport.de,
      },
    });
  }, [exportPdf, view, activeFiltersCount, filtered.length]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/jogadores", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar jogadores`);

        const raw = await res.json();

        const listaApi: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.jogadores)
          ? raw.jogadores
          : [];

        const normalizado: Jogador[] = listaApi.map((p: any) => {
          const idadeN = safeNumber(p?.idade);
          const anoN = safeNumber(p?.anoNascimento);
          const valorN = safeNumber(p?.valorMercado);

          return {
            ...p,
            id: String(p.id),
            nome: String(p.nome ?? ""),

            // garante CPF sempre string (evita quebrar filtro/UI)
            cpf: String(p?.cpf ?? ""),

            idade: idadeN == null ? 0 : Math.trunc(idadeN),
            anoNascimento: anoN == null ? null : Math.trunc(anoN),

            posicao: p.posicao ?? "ATA",
            valorMercado: valorN == null ? 0 : valorN,

            peDominante: (p.peDominante ?? "D") as Jogador["peDominante"],

            representacao: p.representacao ?? "",
            numeroCamisa: p.numeroCamisa ?? null,
            imagemUrl: p.imagemUrl ?? undefined,

            // normaliza clube
            clubeNome: p.clubeNome ?? p.clubeRef?.nome ?? p.clube ?? "—",
            clubeId: p.clubeId ?? p.clubeRef?.id ?? null,
            clubeRef: p.clubeRef ?? null,
          } as Jogador;
        });

        if (active) setData(normalizado);
      } catch (err: any) {
        console.error(err);
        if (active) setError(err?.message ?? t.jogadores.erroCarregar);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ExportPrintButton
        onClick={handleExport}
        loading={exporting}
        disabled={loading || exporting || !!error}
        data-no-export="true"
      />

      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        data-no-export="true"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
      >
        <SlidersHorizontal size={16} />
        {t.jogadores.filtros}
        {activeFiltersCount > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f2cd00] px-1.5 text-xs font-bold text-black">
            {activeFiltersCount}
          </span>
        )}
      </button>

      <div className="hidden text-sm text-gray-500 sm:block" data-no-export="true">
        {loading ? t.common.carregando : `${filtered.length} / ${jogadores.length}`}
      </div>

      <div
        className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white"
        role="group"
        aria-label={t.jogadores.alternarVisualizacao}
        data-no-export="true"
      >
        <button
          type="button"
          className={[
            "flex cursor-pointer items-center gap-1.5 border-none px-3 py-2 text-sm font-medium transition-colors duration-150 hover:bg-gray-100",
            view === "grid" ? "bg-[#f2cd00] font-bold text-black" : "text-slate-900",
          ].join(" ")}
          onClick={() => setView("grid")}
          aria-pressed={view === "grid"}
          title={t.jogadores.exibirCards}
        >
          <LayoutGrid size={16} />
          {t.jogadores.cards}
        </button>

        <button
          type="button"
          className={[
            "flex cursor-pointer items-center gap-1.5 border-none px-3 py-2 text-sm font-medium transition-colors duration-150 hover:bg-gray-100",
            view === "list" ? "bg-[#f2cd00] font-bold text-black" : "text-slate-900",
          ].join(" ")}
          onClick={() => setView("list")}
          aria-pressed={view === "list"}
          title={t.jogadores.exibirLista}
        >
          <List size={16} />
          {t.jogadores.lista}
        </button>
      </div>

      <div className="text-sm text-gray-500 sm:hidden" data-no-export="true">
        {loading ? t.common.carregando : `${filtered.length} / ${jogadores.length}`}
      </div>
    </div>
  );

  return (
    <PageErrorBoundary>
      <section className="w-full bg-gray-50 p-6">
        <PageTitle
          base={t.common.principal}
          title={t.jogadores.title}
          subtitle={t.jogadores.subtitle}
          actions={headerActions}
        />

        {exportError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {t.jogadores.falhaExportar}: {exportError}
          </div>
        ) : null}

        {loading && <div className="mt-4 text-sm text-gray-600">{t.jogadores.carregando}</div>}

        {error && !loading && (
          <div className="mt-4 text-sm text-red-600">{t.common.erro}: {error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-4 text-sm text-gray-600">{t.jogadores.nenhumJogador}</div>
        )}

        {/* ESCOPO EXPORTÁVEL */}
        <div ref={exportRef} className="mt-4" data-export-scope="jogadores">
          {!loading && !error && filtered.length > 0 && (
            <>
              {view === "grid" ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 overflow-x-hidden">
                  {filtered.map((p) => (
                    <div key={p.id} data-pdf-block="true">
                      <Card player={p} />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="overflow-x-auto rounded-[10px] border border-gray-200 bg-white"
                  data-export-scroll="true"
                >
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr>
                        <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                          {t.jogadores.jogador}
                        </th>
                        <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                          {t.jogadores.clube}
                        </th>
                        <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                          {t.jogadores.idade}
                        </th>
                        <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                          {t.jogadores.pe}
                        </th>
                        <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                          {t.jogadores.altura}
                        </th>
                        <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                          {t.jogadores.situacao}
                        </th>
                        <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                          {t.jogadores.valor}
                        </th>
                        <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                          {t.jogadores.posse}
                        </th>
                      </tr>

                      <tr className="h-0">
                        <th colSpan={8} className="h-0 border-none p-0">
                          <div className="block h-[3px] w-full bg-[#f2cd00]" />
                        </th>
                      </tr>
                    </thead>

                    <tbody>{filtered.map((p) => <PlayerRow key={p.id} player={p} />)}</tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <JogadoresFilterDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          jogadores={jogadores}
          value={filters}
          onChange={setFilters}
        />
      </section>
    </PageErrorBoundary>
  );
}