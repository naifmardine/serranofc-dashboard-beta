"use client";

import type { WidgetDataResponse, WidgetSize } from "@/type/dashboard";
import GeoMapWidget from "./GeoMapWidget";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  formatCurrency,
  formatMoneyAxis,
  formatNumber,
} from "@/lib/dashboard/format";

type Props = {
  payload: WidgetDataResponse;
  size?: WidgetSize; // ✅ pra responsividade de ticks
};

export function WidgetRenderer({ payload, size = "md" }: Props) {
  switch (payload.kind) {
    case "geo_map":
      return <GeoMapWidget data={payload.data} size={size} />;

    case "bar":
      return <BarWidget data={payload.data} size={size} />;

    case "line":
      return <LineWidget data={payload.data} size={size} />;

    case "scatter":
      return <ScatterWidget data={payload.data} size={size} />;

    case "kpi":
      return <KpiWidget data={payload.data} />;

    case "hist":
      // hist => usa BarWidget com shape {bucket,count}
      return <BarWidget data={payload.data as any} size={size} />;

    case "empty":
    default:
      return null;
  }
}

/* ---------------- helpers ---------------- */

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function shouldTreatAsMoney(key: string) {
  const k = key.toLowerCase();
  return (
    k.includes("valor") ||
    k.includes("value") ||
    k.includes("fee") ||
    k.includes("total") ||
    k.includes("volume") ||
    k.includes("avg") ||
    k.includes("ticket")
  );
}

function pickLabelKey(sample: Record<string, any>) {
  const preferred = [
    "period",
    "faixa",
    "posicao",
    "jogador",
    "clube",
    "agencia",
    "label",
    "tipo",
    "pais",
    "liga",
    "bucket", // ✅ pra hist
  ];
  for (const k of preferred) {
    if (k in sample && typeof sample[k] !== "number") return k;
  }
  return (
    Object.keys(sample).find((k) => typeof sample[k] !== "number") ??
    Object.keys(sample)[0]
  );
}

function pickNumericKeys(sample: Record<string, any>) {
  return Object.keys(sample).filter((k) => isFiniteNumber(sample[k]));
}

function formatByKey(value: any, key: string) {
  if (!isFiniteNumber(value)) return "—";
  return shouldTreatAsMoney(key)
    ? formatCurrency(value, "EUR")
    : formatNumber(value);
}

function axisTickByKey(value: any, key: string) {
  if (!isFiniteNumber(value)) return "—";
  return shouldTreatAsMoney(key)
    ? formatMoneyAxis(value, "EUR")
    : formatNumber(value);
}

/** ticks anuais quando period=YYYY-MM */
function buildYearTicksFromPeriod(data: any[], labelKey: string) {
  if (labelKey !== "period") return null;

  const periods = data
    .map((d) => String(d?.[labelKey] ?? ""))
    .filter((p) => /^\d{4}-\d{2}$/.test(p));

  if (!periods.length) return null;

  // pega só janeiro de cada ano (YYYY-01)
  const ticks = Array.from(new Set(periods.filter((p) => p.endsWith("-01")))).sort();
  return ticks.length ? ticks : null;
}

/* ---------------- BAR ---------------- */

function BarWidget({ data, size }: { data: any[]; size: WidgetSize }) {
  if (!data?.length) return null;

  const sample = data[0] ?? {};
  const labelKey = pickLabelKey(sample);
  const numericKeys = pickNumericKeys(sample);
  if (!numericKeys.length) return null;

  // ✅ X ticks anuais quando for period
  const yearTicks = buildYearTicksFromPeriod(data, labelKey);

  // ✅ caso especial: 1 métrica money + 1 métrica count -> dual axis
  const moneyKeys = numericKeys.filter(shouldTreatAsMoney);
  const countKeys = numericKeys.filter((k) => !shouldTreatAsMoney(k));

  const canDualAxis =
    moneyKeys.length === 1 &&
    countKeys.length === 1 &&
    numericKeys.length === 2;

  // labels
  const rotateLabels = labelKey !== "period" && data.length <= 14;
  const xTickProps = rotateLabels
    ? { angle: -25, textAnchor: "end" as const, height: 60 }
    : undefined;

  // ✅ espaço suficiente pro eixo (sem cortar)
  const yLeftWidth = canDualAxis
    ? 120
    : numericKeys.some(shouldTreatAsMoney)
      ? 120
      : 60;

  const yRightWidth = canDualAxis ? 72 : 0;

  // (size) hoje não muda muito aqui, mas deixo o param pq vc usa em outros
  void size;

  return (
    <div className="h-full w-full min-w-0 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: canDualAxis ? 24 : 16,
            bottom: 10,
            left: 18,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey={labelKey}
            tick={{ fontSize: 12 }}
            interval={yearTicks ? "preserveStartEnd" : 0}
            ticks={yearTicks ?? undefined}
            tickFormatter={(v) =>
              labelKey === "period" && typeof v === "string"
                ? v.slice(0, 4)
                : String(v)
            }
            {...(xTickProps ?? {})}
          />

          {/* Left axis */}
          <YAxis
            yAxisId="left"
            width={yLeftWidth}
            tick={{ fontSize: 12 }}
            tickMargin={6}
            tickFormatter={(v) =>
              axisTickByKey(v, canDualAxis ? moneyKeys[0] : numericKeys[0])
            }
          />

          {/* Right axis (deals / count) */}
          {canDualAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              width={yRightWidth}
              tick={{ fontSize: 12 }}
              tickMargin={6}
              tickFormatter={(v) => axisTickByKey(v, countKeys[0])}
            />
          )}

          <Tooltip
            formatter={(v: any, name: any) => formatByKey(v, String(name))}
            labelFormatter={(l) => String(l)}
          />

          {canDualAxis ? (
            <>
              <Bar dataKey={moneyKeys[0]} yAxisId="left" radius={[4, 4, 0, 0]} />
              <Bar dataKey={countKeys[0]} yAxisId="right" radius={[4, 4, 0, 0]} />
            </>
          ) : (
            numericKeys.map((k) => (
              <Bar key={k} dataKey={k} radius={[4, 4, 0, 0]} />
            ))
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- LINE ---------------- */

function LineWidget({ data, size }: { data: any[]; size: WidgetSize }) {
  if (!data?.length) return null;

  const sample = data[0] ?? {};
  const labelKey = pickLabelKey(sample);
  const numericKeys = pickNumericKeys(sample);
  if (!numericKeys.length) return null;

  // ✅ ticks anuais no eixo X quando period
  const yearTicks = buildYearTicksFromPeriod(data, labelKey);

  const anyMoney = numericKeys.some(shouldTreatAsMoney);
  const yWidth = anyMoney ? 120 : 60;

  // (size) hoje não muda muito aqui, mas deixo o param pq vc usa em outros
  void size;

  return (
    <div className="h-full w-full min-w-0 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 18 }}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey={labelKey}
            tick={{ fontSize: 12 }}
            ticks={yearTicks ?? undefined}
            interval={yearTicks ? "preserveStartEnd" : undefined}
            tickFormatter={(v) =>
              labelKey === "period" && typeof v === "string"
                ? v.slice(0, 4)
                : String(v)
            }
          />

          <YAxis
            width={yWidth}
            tick={{ fontSize: 12 }}
            tickMargin={6}
            tickFormatter={(v) => axisTickByKey(v, numericKeys[0])}
          />

          <Tooltip
            formatter={(v: any, name: any) => formatByKey(v, String(name))}
            labelFormatter={(l) => String(l)}
          />

          {numericKeys.map((k) => (
            <Line key={k} type="monotone" dataKey={k} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- SCATTER ---------------- */

function buildIntegerTicks(min: number, max: number, size: WidgetSize) {
  const lo = Math.floor(min);
  const hi = Math.ceil(max);

  const range = hi - lo;
  if (range <= 0) return [lo];

  // LG: tenta mostrar todos se couber
  if (size === "lg" && range <= 18) {
    return Array.from({ length: range + 1 }, (_, i) => lo + i);
  }

  // SM/MD ou range grande: reduz densidade
  const maxTicks = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const step = Math.max(1, Math.ceil(range / maxTicks));

  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== hi) ticks.push(hi);
  return ticks;
}

function ScatterWidget({ data, size }: { data: any[]; size: WidgetSize }) {
  if (!data?.length) return null;

  const cleaned = data
    .map((d) => ({
      ...d,
      idade: typeof d.idade === "string" ? Number(d.idade) : d.idade,
      valor: typeof d.valor === "string" ? Number(d.valor) : d.valor,
    }))
    .filter((d) => isFiniteNumber(d.idade) && isFiniteNumber(d.valor));

  if (!cleaned.length) return null;

  const idades = cleaned.map((d) => d.idade as number);
  const minIdade = Math.min(...idades);
  const maxIdade = Math.max(...idades);
  const idadeTicks = buildIntegerTicks(minIdade - 1, maxIdade + 1, size);

  return (
    <div className="h-full w-full min-w-0 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: 18 }}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            type="number"
            dataKey="idade"
            name="Idade"
            tick={{ fontSize: 12 }}
            allowDecimals={false}
            ticks={idadeTicks}
            domain={["dataMin - 1", "dataMax + 1"]}
          />

          <YAxis
            type="number"
            dataKey="valor"
            name="Valor"
            width={120}
            tick={{ fontSize: 12 }}
            tickMargin={6}
            tickFormatter={(v) => formatMoneyAxis(v, "EUR")}
            domain={["dataMin", "dataMax"]}
          />

          <Tooltip
            formatter={(v: any, name: any) =>
              String(name) === "valor" ? formatCurrency(v, "EUR") : formatNumber(v)
            }
            labelFormatter={() => ""}
          />

          <Scatter data={cleaned} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- KPI ---------------- */

function KpiWidget({
  data,
}: {
  data: { label: string; value: number | null; sub?: string; unit?: string };
}) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      <span className="text-2xl font-semibold text-slate-900">
        {data.value !== null ? formatNumber(data.value) : "—"}
      </span>
      <span className="text-xs text-slate-500">{data.label}</span>
      {data.sub && <span className="text-xs text-slate-400">{data.sub}</span>}
    </div>
  );
}
