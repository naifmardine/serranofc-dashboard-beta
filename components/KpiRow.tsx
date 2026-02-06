"use client";

import { KpisApiResponse } from "@/type/dashboard";
import { formatCurrency, formatNumber } from "@/lib/dashboard/format";

type Props = {
  data?: KpisApiResponse | null;
  loading?: boolean;
};

export function KpiRow({ data, loading }: Props) {
  const kpis = data?.ok ? data.kpis : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
      <KpiCard
        colSpan={3}
        title="Jogadores do Serrano"
        value={loading ? null : (kpis?.["serrano.players_count"]?.value ?? null)}
        unit={kpis?.["serrano.players_count"]?.unit}
      />
      <KpiCard
        colSpan={3}
        title="Valor de mercado total"
        value={loading ? null : (kpis?.["serrano.total_market_value"]?.value ?? null)}
        unit={kpis?.["serrano.total_market_value"]?.unit}
      />
      <KpiCard
        colSpan={3}
        title="Idade média"
        value={loading ? null : (kpis?.["serrano.avg_age"]?.value ?? null)}
        unit={kpis?.["serrano.avg_age"]?.unit}
      />
      <KpiCard
        colSpan={3}
        title="Transações no mercado"
        value={loading ? null : (kpis?.["market.deals_count"]?.value ?? null)}
        unit={kpis?.["market.deals_count"]?.unit}
      />
      <KpiCard
        colSpan={3}
        title="Volume financeiro do mercado"
        value={loading ? null : (kpis?.["market.total_fee"]?.value ?? null)}
        unit={kpis?.["market.total_fee"]?.unit}
      />
      <KpiCard
        colSpan={3}
        title="Ticket médio"
        value={loading ? null : (kpis?.["market.avg_fee"]?.value ?? null)}
        unit={kpis?.["market.avg_fee"]?.unit}
      />
    </div>
  );
}

function lgColSpanKpi(colSpan: number) {
  // Tailwind-safe: classes fixas
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

function KpiCard({
  title,
  value,
  unit,
  colSpan,
}: {
  title: string;
  value: number | null;
  unit?: string;
  colSpan: number;
}) {
  const display =
    value === null
      ? "—"
      : unit === "EUR"
        ? formatCurrency(value)
        : formatNumber(value);

  return (
    <div
      className={[
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        "col-span-1 sm:col-span-1",
        lgColSpanKpi(colSpan),
      ].join(" ")}
    >
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{display}</div>
    </div>
  );
}
