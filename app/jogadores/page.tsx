"use client";

import React, { useEffect, useMemo, useState } from "react";

import Card from "@/components/Card";
import PlayerRow from "@/components/PlayerRow";
import JogadoresFilterDrawer, {
  type JogadoresFilters,
  NONE_AGENCY,
} from "@/components/JogadoresFilter";
import type { Jogador } from "@/type/jogador";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";

/* =========================
   Error boundary (mantido)
========================= */
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
      return (
        <section className="w-full bg-gray-50 p-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-2 font-bold">Erro ao carregar “Jogadores”.</h3>
            <pre className="whitespace-pre-wrap wrap-break-word text-xs text-red-800">
              {String(
                this.state.err?.message ?? this.state.err ?? "Erro desconhecido",
              )}
            </pre>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

/* =========================
   Helpers
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
};

function normStr(v: any) {
  return String(v ?? "").trim();
}

// considera essas strings como "vazio" pro filtro de agência
function normalizeAgency(v: any) {
  const s = normStr(v).toLowerCase();
  if (!s) return "";
  if (s === "—" || s === "-" || s === "n/a" || s === "na" || s === "null")
    return "";
  return normStr(v);
}

function normalizeClub(j: any) {
  // teu backend já deveria mandar clubeNome, mas fica resiliente
  const s = normStr(j?.clubeNome ?? j?.clube);
  return s || "—";
}

function agencyMatches(j: any, selected: string[]) {
  if (!selected || selected.length === 0) return true;

  const agency = normalizeAgency(j?.representacao);
  const hasAgency = agency.length > 0;

  const wantsNone = selected.includes(NONE_AGENCY);
  const selectedAgencies = selected.filter((x) => x !== NONE_AGENCY);

  // só "Sem agência"
  if (wantsNone && selectedAgencies.length === 0) return !hasAgency;

  // mistura: "Sem agência" OU (agências selecionadas)
  if (wantsNone) {
    return !hasAgency || (hasAgency && selectedAgencies.includes(agency));
  }

  // só agências normais
  return hasAgency && selectedAgencies.includes(agency);
}

export default function JogadoresPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [data, setData] = useState<Jogador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<JogadoresFilters>(EMPTY_FILTERS);

  useEffect(() => {
    let active = true;

    async function load() {
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

        // normalização mínima (sem inventar dado — só estabiliza shape)
        const normalizado: Jogador[] = listaApi.map((p: any) => ({
          ...p,
          id: String(p.id),
          nome: p.nome ?? "",
          idade: typeof p.idade === "number" ? p.idade : Number(p.idade ?? 0),
          posicao: p.posicao ?? "—",
          valorMercado:
            typeof p.valorMercado === "number"
              ? p.valorMercado
              : Number(p.valorMercado ?? 0),
          peDominante: (p.peDominante ?? "D") as Jogador["peDominante"],
          representacao: p.representacao ?? "",
          numeroCamisa: p.numeroCamisa ?? 0,
          imagemUrl: p.imagemUrl ?? undefined,

          // clubeNome/club fallback:
          clubeNome: p.clubeNome ?? p.clube ?? "—",
          clube: p.clube ?? p.clubeNome ?? "—",
        }));

        if (active) setData(normalizado);
      } catch (err: any) {
        console.error(err);
        if (active) setError(err?.message ?? "Erro ao buscar jogadores");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const jogadores = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filtered = useMemo(() => {
    const f = filters;

    return jogadores.filter((j: any) => {
      // clube
      const clubeNome = normalizeClub(j);
      if (f.clubes.length && !f.clubes.includes(clubeNome)) return false;

      // agência (CORRIGIDO: sentinel + vazio)
      if (!agencyMatches(j, f.agencias)) return false;

      // posição
      const pos = normStr(j?.posicao);
      if (f.posicoes.length && !f.posicoes.includes(pos)) return false;

      // pé dominante
      const pe = normStr(j?.peDominante);
      if (f.peDominante.length && !f.peDominante.includes(pe)) return false;

      // idade
      const idade = Number(j?.idade ?? 0);
      if (typeof f.idadeMin === "number" && idade < f.idadeMin) return false;
      if (typeof f.idadeMax === "number" && idade > f.idadeMax) return false;

      // valor (em milhões, como no drawer)
      const valor = Number(j?.valorMercado ?? 0);
      if (typeof f.valorMin === "number" && valor < f.valorMin) return false;
      if (typeof f.valorMax === "number" && valor > f.valorMax) return false;

      return true;
    });
  }, [jogadores, filters]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.clubes.length) n++;
    if (filters.agencias.length) n++;
    if (filters.posicoes.length) n++;
    if (filters.peDominante.length) n++;
    if (
      typeof filters.idadeMin === "number" ||
      typeof filters.idadeMax === "number"
    )
      n++;
    if (
      typeof filters.valorMin === "number" ||
      typeof filters.valorMax === "number"
    )
      n++;
    return n;
  }, [filters]);

  return (
    <PageErrorBoundary>
      <section className="w-full bg-gray-50 p-6">
        <div className="mb-4 flex flex-col gap-3">
          <nav
            className="flex items-center gap-1.5 text-sm text-gray-500"
            aria-label="Breadcrumb"
          >
            <span>Principal</span>
            <span>›</span>
            <span className="font-semibold text-slate-900">Jogadores</span>
          </nav>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900">
                Jogadores
              </h2>

              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
              >
                <SlidersHorizontal size={16} />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f2cd00] px-1.5 text-xs font-bold text-black">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <div className="text-sm text-gray-500">
                {loading
                  ? "Carregando..."
                  : `${filtered.length} / ${jogadores.length}`}
              </div>
            </div>

            <div
              className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white"
              role="group"
              aria-label="Alternar visualização"
            >
              <button
                type="button"
                className={`flex cursor-pointer items-center gap-1.5 border-none px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-150 hover:bg-gray-100 ${
                  view === "grid" ? "bg-[#f2cd00] font-bold text-black" : ""
                }`}
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                title="Exibir em cards"
              >
                <LayoutGrid size={16} />
                Cards
              </button>
              <button
                type="button"
                className={`flex cursor-pointer items-center gap-1.5 border-none px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-150 hover:bg-gray-100 ${
                  view === "list" ? "bg-[#f2cd00] font-bold text-black" : ""
                }`}
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                title="Exibir em lista"
              >
                <List size={16} />
                Lista
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-2 text-sm text-gray-600">
            Carregando jogadores...
          </div>
        )}

        {error && !loading && (
          <div className="mt-2 text-sm text-red-600">
            Erro ao carregar jogadores: {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Nenhum jogador com os filtros atuais.
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {view === "grid" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 overflow-x-hidden">
                {filtered.map((p) => (
                  <Card key={p.id} player={p} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse overflow-hidden rounded-[10px] bg-white">
                  <thead>
                    <tr>
                      <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                        Jogador
                      </th>
                      <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                        Clube
                      </th>
                      <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                        Idade
                      </th>
                      <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                        Pé
                      </th>
                      <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                        Altura
                      </th>
                      <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                        Situação
                      </th>
                      <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                        Valor
                      </th>
                      <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold uppercase tracking-wider text-slate-900">
                        Posse
                      </th>
                    </tr>

                    <tr className="h-0">
                      <th colSpan={8} className="h-0 border-none p-0">
                        <div className="block h-[3px] w-full bg-[#f2cd00]" />
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((p) => (
                      <PlayerRow key={p.id} player={p} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

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
