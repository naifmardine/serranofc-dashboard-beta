"use client";

import type { KpisApiResponse, WidgetScope } from "@/type/dashboard";
import { formatCurrency, formatNumber } from "@/lib/dashboard/format";
import { Info } from "lucide-react";

type Props = {
  data?: KpisApiResponse | null;
  loading?: boolean;
  scope: WidgetScope;
};

export function KpiRow({ data, loading, scope }: Props) {
  const kpis = data?.ok ? data.kpis : null;

  const showSerrano = scope === "serrano" || scope === "both";
  const showMarket = scope === "market" || scope === "both";

  return (
    <div className="space-y-6">
      {showSerrano && (
        <KpiSection title="Indicadores Serrano">
          <KpiCard
            title="Jogadores do Serrano"
            value={loading ? null : (kpis?.["serrano.players_count"]?.value ?? null)}
            hint="Quantidade total de jogadores cadastrados no elenco/base do Serrano."
          />
          <KpiCard
            title="Valor de mercado total"
            value={loading ? null : (kpis?.["serrano.total_market_value"]?.value ?? null)}
            unit="EUR"
            hint="Soma do valor de mercado de todos os jogadores do Serrano."
          />
          <KpiCard
            title="Idade média"
            value={loading ? null : (kpis?.["serrano.avg_age"]?.value ?? null)}
            hint="Média das idades dos jogadores do Serrano."
          />
          <KpiCard
            title="Valor atribuído ao Serrano"
            value={
              loading
                ? null
                : (kpis?.["serrano.total_market_value_weighted"]?.value ?? null)
            }
            unit="EUR"
            hint="Soma do valor de mercado ponderado pelo % (possePct) do Serrano em cada jogador."
          />
        </KpiSection>
      )}

      {showMarket && (
        <KpiSection title="Indicadores Mercado">
          <KpiCard
            title="Transações no mercado"
            value={loading ? null : (kpis?.["market.deals_count"]?.value ?? null)}
            hint="Total de transferências registradas no mercado."
          />
          <KpiCard
            title="Volume financeiro do mercado"
            value={loading ? null : (kpis?.["market.total_fee"]?.value ?? null)}
            unit="EUR"
            hint="Soma dos valores (fees) de todas as transferências no mercado."
          />
          <KpiCard
            title="Ticket médio"
            value={loading ? null : (kpis?.["market.avg_fee"]?.value ?? null)}
            unit="EUR"
            hint="Média do valor (fee) por transferência no mercado."
          />
          <KpiCard
            title="Transações/mês"
            value={loading ? null : (kpis?.["market.deals_per_month"]?.value ?? null)}
            decimals={1}
            hint="Total de transferências dividido pelo número de meses distintos com dados."
          />
        </KpiSection>
      )}
    </div>
  );
}

function KpiSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-3">
          <div className="h-px w-10 bg-slate-200" />
          <div className="text-sm font-medium text-slate-600">{title}</div>
          <div className="h-px w-10 bg-slate-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        {children}
      </div>
    </section>
  );
}

function lgColSpanKpi(colSpan: number) {
  switch (colSpan) {
    case 3:
      return "lg:col-span-3";
    case 4:
      return "lg:col-span-4";
    case 6:
      return "lg:col-span-6";
    case 12:
      return "lg:col-span-12";
    default:
      return "lg:col-span-3";
  }
}

function formatWithDecimals(n: number, decimals: number) {
  if (!Number.isFinite(n)) return "—";
  const factor = 10 ** decimals;
  const rounded = Math.round(n * factor) / factor;

  if (decimals <= 0) return formatNumber(rounded);
  // garante sempre 1 casa quando decimals=1 (ex: 5.0)
  return rounded.toFixed(decimals);
}

function KpiCard({
  title,
  value,
  unit,
  hint,
  colSpan = 3,
  decimals,
}: {
  title: string;
  value: number | null;
  unit?: string;
  hint: string;
  colSpan?: number;
  decimals?: number; // opcional: força casas decimais (ex: deals/mês)
}) {
  const isEmpty = value === null;

  const mainValue = isEmpty
    ? "—"
    : unit === "EUR"
      ? formatCurrency(value)
      : typeof decimals === "number"
        ? formatWithDecimals(value, decimals)
        : formatNumber(value);

  return (
    <div
      className={[
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        "col-span-1 sm:col-span-1",
        lgColSpanKpi(colSpan),
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-slate-500">{title}</div>

        <InfoTooltip text={hint} />
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-xl font-semibold text-slate-900">{mainValue}</div>
        {/* unit removida de deals/mês (fica só no título); e EUR já é formatCurrency */}
        {!isEmpty && unit && unit !== "EUR" ? (
          <div className="text-xs font-medium text-slate-500">{unit}</div>
        ) : null}
      </div>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="relative group shrink-0">
      <button
        type="button"
        aria-label="Informações"
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-md",
          "text-slate-400 hover:text-slate-600",
          "hover:bg-slate-100 transition",
          "focus:outline-none focus:ring-2 focus:ring-slate-900/20",
        ].join(" ")}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      <div
        className={[
          "pointer-events-none absolute right-0 top-7 z-50 w-64",
          "opacity-0 translate-y-1",
          "group-hover:opacity-100 group-hover:translate-y-0",
          "transition",
        ].join(" ")}
      >
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
          {text}
        </div>
      </div>
    </div>
  );
}
