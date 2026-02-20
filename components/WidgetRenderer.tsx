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

import { useMemo, useState } from "react";

import { formatCurrency, formatMoneyAxis, formatNumber } from "@/lib/dashboard/format";
import { usePlayersDrilldown } from "@/components/PlayersDrilldownProvider";


const SERRANO_COLOR = "#003399";
const MARKET_COLOR = "#475569";
//f2cd00

/* ==============================
   Types
============================== */
type Props = {
  payload: WidgetDataResponse;
  size?: WidgetSize;
};

/* ==============================
   Public
============================== */
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
      return <BarWidget data={payload.data as any} size={size} />;

    case "bar_toggle":
      return (
        <BarToggleWidget
          options={payload.options}
          defaultId={payload.defaultId}
          size={size}
        />
      );

    case "empty":
    default:
      return null;
  }
}

/* ==============================
   Helpers (format/labels)
============================== */

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function shouldTreatAsPercent(key: string) {
  const k = key.toLowerCase();
  return k.includes("pct") || k.includes("percent") || k.endsWith("pct");
}

function shouldTreatAsMoney(key: string) {
  const k = key.toLowerCase();
  // sinais fortes de dinheiro
  const moneySignals = ["valor", "value", "fee", "cost", "ticket", "revenue", "volume"];
  return moneySignals.some((s) => k.includes(s));
}

function formatByKey(value: any, key: string) {
  if (!isFiniteNumber(value)) return "—";
  if (shouldTreatAsPercent(key)) return `${value.toFixed(1)}%`;
  if (shouldTreatAsMoney(key)) return formatCurrency(value, "EUR");
  return formatNumber(value);
}

function axisTickByKey(value: any, key: string) {
  if (!isFiniteNumber(value)) return "—";
  if (shouldTreatAsPercent(key)) return `${value.toFixed(0)}%`;
  if (shouldTreatAsMoney(key)) return formatMoneyAxis(value, "EUR");
  return formatNumber(value);
}

function titleCasePt(s: string) {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function prettifyKey(raw: string) {
  if (!raw) return "—";
  const key = String(raw);

  const direct: Record<string, string> = {
    // comuns
    jogadores: "Jogadores",
    jogador: "Jogador",
    clube: "Clube",
    agencia: "Agência",
    pais: "País",
    liga: "Liga",
    uf: "UF",
    estado: "Estado",
    faixa: "Faixa",
    bucket: "Faixa",

    // valores / dinheiro
    valor: "Valor",
    fee: "Valor",
    totalFee: "Volume (€)",
    total_fee: "Volume (€)",
    avgFee: "Valor médio",
    avg_fee: "Valor médio",
    revenue: "Receita",
    cost: "Custo",
    volume: "Volume",

    // comparativos
    serranoPct: "Serrano (%)",
    marketPct: "Mercado (%)",
    serranoAge: "Idade média (Serrano)",
    marketAge: "Idade média (Mercado)",
    serrano: "Serrano",
    market: "Mercado",
    deals: "Transações",

    // tempo
    period: "Período",
  };

  if (direct[key]) return direct[key];

  // snake_case / camelCase -> palavras
  const spaced = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();

  // traduzir alguns tokens que sempre aparecem feios
  const tokens: Record<string, string> = {
    avg: "médio",
    total: "total",
    count: "quantidade",
    pct: "%",
  };

  const words = spaced.split(/\s+/).map((w) => {
    const wl = w.toLowerCase();
    if (tokens[wl]) return tokens[wl];
    return w;
  });

  return titleCasePt(words.join(" "));
}

function prettifyPosicao(code: any) {
  const c = String(code ?? "").trim().toUpperCase();
  const map: Record<string, string> = {
    GOL: "Goleiros",
    ZAG: "Zagueiros",
    LD: "Lateral direito",
    LE: "Lateral esquerdo",
    LAT: "Laterais",
    VOL: "Volantes",
    MC: "Meio-campistas",
    MEI: "Meias",
    PD: "Ponta direita",
    PE: "Ponta esquerda",
    PON: "Pontas",
    ATA: "Atacantes",
  };
  return map[c] ?? (c || "—");
}

function prettifyXValue(labelKey: string, v: any) {
  if (v == null) return "—";

  const lk = String(labelKey).toLowerCase();

  if (lk === "posicao") return prettifyPosicao(v);

  // period "YYYY-MM" -> "YYYY"
  if (lk === "period" && typeof v === "string" && /^\d{4}-\d{2}$/.test(v)) {
    return v.slice(0, 4);
  }

  // bucket/faixa/etc
  return String(v);
}

function buildTitleFromPoint(labelKey: string, point: any) {
  const prettyKey = prettifyKey(labelKey);
  const label = prettifyXValue(labelKey, point?.[labelKey]);
  if (!label || label === "—") return "Jogadores";
  return `${prettyKey}: ${label}`;
}

/* ==============================
   Helpers (data inspection)
============================== */

const pickLabelKey = (sample: Record<string, any>) => {
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
    "bucket",
    "uf",
    "estado",
  ];
  for (const k of preferred) {
    if (k in sample && typeof sample[k] !== "number") return k;
  }
  return (
    Object.keys(sample).find((k) => typeof sample[k] !== "number") ??
    Object.keys(sample)[0]
  );
};

const pickNumericKeys = (sample: Record<string, any>) =>
  Object.keys(sample).filter((k) => isFiniteNumber(sample[k]));

const buildYearTicksFromPeriod = (data: any[], labelKey: string) => {
  if (labelKey !== "period") return null;

  const periods = data
    .map((d) => String(d?.[labelKey] ?? ""))
    .filter((p) => /^\d{4}-\d{2}$/.test(p));

  if (!periods.length) return null;

  const ticks = Array.from(new Set(periods.filter((p) => p.endsWith("-01")))).sort();
  return ticks.length ? ticks : null;
};

const extractDrill = (payload: any) => {
  if (!payload || typeof payload !== "object") return null;

  const ids = Array.isArray(payload.playerIds) ? payload.playerIds.map(String) : null;
  const players = Array.isArray(payload.players) ? payload.players : null;

  const singleIdRaw = payload.id ?? payload.playerId;
  const singleId = singleIdRaw != null ? String(singleIdRaw) : null;

  if (ids && ids.length) return { kind: "ids" as const, ids };
  if (players && players.length) return { kind: "raw" as const, players };
  if (singleId) return { kind: "ids" as const, ids: [singleId] };

  return null;
};

/* ==============================
   Legend (custom)
============================== */

function LegendRow({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  if (!items.length) return null;

  return (
      <div className="mt-2 mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-600">
      {items.map((it) => (
        <div key={it.label} className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: it.color }}
          />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

function getBarColorForKey(key: string, fallbackIndex: number) {
  const k = key.toLowerCase();

  // comparativos (prioridade)
  if (k.includes("serrano")) return SERRANO_COLOR;
  if (k.includes("market")) return MARKET_COLOR;

  // resto: ciclo simples (não inventa paleta)
  return fallbackIndex % 2 === 0 ? SERRANO_COLOR : MARKET_COLOR;
}

/* ==============================
   BAR TOGGLE
============================== */

function BarToggleWidget({
  options,
  defaultId,
  size,
}: {
  options: { id: string; label: string; data: any[] }[];
  defaultId?: string;
  size: WidgetSize;
}) {
  const safeDefault =
    defaultId && options.some((o) => o.id === defaultId) ? defaultId : options[0]?.id;

  const [active, setActive] = useState<string>(safeDefault);
  const current = options.find((o) => o.id === active) ?? options[0];
  if (!current) return null;

  return (
    <div className="h-full w-full min-w-0 min-h-0 flex flex-col gap-2">
      <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-1">
        {options.map((opt) => {
          const isActive = opt.id === active;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setActive(opt.id)}
              className={[
                "rounded-md px-3 py-1.5 text-xs transition",
                isActive
                  ? "text-white"
                  : "text-slate-700 hover:bg-slate-50",
              ].join(" ")}
              style={isActive ? { backgroundColor: SERRANO_COLOR } : undefined}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 min-w-0">
        <BarWidget data={current.data} size={size} />
      </div>
    </div>
  );
}

/* ==============================
   BAR
============================== */

function BarWidget({ data, size }: { data: any[]; size: WidgetSize }) {
  const drill = usePlayersDrilldown();
  if (!data?.length) return null;

  const sample = data[0] ?? {};
  const labelKey = pickLabelKey(sample);
  const numericKeys = pickNumericKeys(sample);
  if (!numericKeys.length) return null;

  const yearTicks = buildYearTicksFromPeriod(data, labelKey);

  // dual axis: dinheiro + count
  const moneyKeys = numericKeys.filter(shouldTreatAsMoney);
  const countKeys = numericKeys.filter((k) => !shouldTreatAsMoney(k));

  const canDualAxis =
    moneyKeys.length === 1 && countKeys.length === 1 && numericKeys.length === 2;

  const rotateLabels = labelKey !== "period" && data.length <= 14;
  const xTickProps = rotateLabels
    ? { angle: -25, textAnchor: "end" as const, height: 60 }
    : undefined;

  const yLeftWidth = canDualAxis
    ? 120
    : numericKeys.some(shouldTreatAsMoney)
      ? 120
      : 60;

  const yRightWidth = canDualAxis ? 72 : 0;

  const onBarClick = useMemo(() => {
    return (barEvent: any) => {
      const point = barEvent?.payload ?? barEvent;
      const drillInfo = extractDrill(point);
      if (!drillInfo) return;

      const title = buildTitleFromPoint(labelKey, point);

      if (drillInfo.kind === "ids") {
        void drill.openFromIds(title, drillInfo.ids);
        return;
      }
      void drill.openFromRaw(title, drillInfo.players);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill, labelKey]);

  // legenda: sempre que tiver 2 séries ou dual axis
  const legendItems = useMemo(() => {
    if (canDualAxis) {
      const leftKey = moneyKeys[0];
      const rightKey = countKeys[0];

      return [
        { label: prettifyKey(leftKey), color: getBarColorForKey(leftKey, 0) },
        { label: prettifyKey(rightKey), color: getBarColorForKey(rightKey, 1) },
      ];
    }

    if (numericKeys.length <= 1) return [];
    return numericKeys.map((k, i) => ({
      label: prettifyKey(k),
      color: getBarColorForKey(k, i),
    }));
  }, [canDualAxis, moneyKeys, countKeys, numericKeys]);

  void size;

  return (
    <div className="h-full w-full min-w-0 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 min-w-0">
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
              tickFormatter={(v) => prettifyXValue(labelKey, v)}
              {...(xTickProps ?? {})}
            />

            <YAxis
              yAxisId="left"
              width={yLeftWidth}
              tick={{ fontSize: 12 }}
              tickMargin={6}
              tickFormatter={(v) =>
                axisTickByKey(v, canDualAxis ? moneyKeys[0] : numericKeys[0])
              }
            />

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
              labelFormatter={(l: any) => {
                const fakePoint = { [labelKey]: l };
                return buildTitleFromPoint(labelKey, fakePoint);
              }}
              formatter={(v: any, name: any) => [
                formatByKey(v, String(name)),
                prettifyKey(String(name)),
              ]}
            />

            {canDualAxis ? (
              <>
                <Bar
                  dataKey={moneyKeys[0]}
                  yAxisId="left"
                  radius={[4, 4, 0, 0]}
                  onClick={onBarClick}
                  fill={getBarColorForKey(moneyKeys[0], 0)}
                />
                <Bar
                  dataKey={countKeys[0]}
                  yAxisId="right"
                  radius={[4, 4, 0, 0]}
                  onClick={onBarClick}
                  fill={getBarColorForKey(countKeys[0], 1)}
                />
              </>
            ) : (
              numericKeys.map((k, i) => (
                <Bar
                  key={k}
                  dataKey={k}
                  radius={[4, 4, 0, 0]}
                  onClick={onBarClick}
                  fill={getBarColorForKey(k, i)}
                />
              ))
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <LegendRow items={legendItems} />
    </div>
  );
}

/* ==============================
   LINE
============================== */

function LineWidget({ data, size }: { data: any[]; size: WidgetSize }) {
  if (!data?.length) return null;

  const sample = data[0] ?? {};
  const labelKey = pickLabelKey(sample);
  const numericKeys = pickNumericKeys(sample);
  if (!numericKeys.length) return null;

  const yearTicks = buildYearTicksFromPeriod(data, labelKey);

  const anyMoney = numericKeys.some(shouldTreatAsMoney);
  const yWidth = anyMoney ? 120 : 60;

  const legendItems = useMemo(() => {
    if (numericKeys.length <= 1) return [];
    return numericKeys.map((k, i) => ({
      label: prettifyKey(k),
      color: getBarColorForKey(k, i),
    }));
  }, [numericKeys]);

  void size;

  return (
    <div className="h-full w-full min-w-0 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 18 }}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey={labelKey}
              tick={{ fontSize: 12 }}
              ticks={yearTicks ?? undefined}
              interval={yearTicks ? "preserveStartEnd" : undefined}
              tickFormatter={(v) => prettifyXValue(labelKey, v)}
            />

            <YAxis
              width={yWidth}
              tick={{ fontSize: 12 }}
              tickMargin={6}
              tickFormatter={(v) => axisTickByKey(v, numericKeys[0])}
            />

            <Tooltip
              labelFormatter={(l: any) => {
                const fakePoint = { [labelKey]: l };
                return buildTitleFromPoint(labelKey, fakePoint);
              }}
              formatter={(v: any, name: any) => [
                formatByKey(v, String(name)),
                prettifyKey(String(name)),
              ]}
            />

            {numericKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                strokeWidth={2}
                dot={false}
                stroke={getBarColorForKey(k, i)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <LegendRow items={legendItems} />
    </div>
  );
}

/* ==============================
   SCATTER
============================== */

const buildIntegerTicks = (min: number, max: number, size: WidgetSize) => {
  const lo = Math.floor(min);
  const hi = Math.ceil(max);

  const range = hi - lo;
  if (range <= 0) return [lo];

  if (size === "lg" && range <= 18) {
    return Array.from({ length: range + 1 }, (_, i) => lo + i);
  }

  const maxTicks = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const step = Math.max(1, Math.ceil(range / maxTicks));

  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== hi) ticks.push(hi);
  return ticks;
};

function ScatterWidget({ data, size }: { data: any[]; size: WidgetSize }) {
  const drill = usePlayersDrilldown();
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

  const onPointClick = useMemo(() => {
    return (evt: any) => {
      const point = evt?.payload ?? evt;
      const drillInfo = extractDrill(point);
      if (!drillInfo) return;

      const nome = point?.nome ?? point?.jogador ?? point?.label;
      const title = nome ? `Jogador: ${String(nome)}` : "Jogador";

      if (drillInfo.kind === "ids") {
        void drill.openFromIds(title, drillInfo.ids);
        return;
      }
      void drill.openFromRaw(title, drillInfo.players);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill]);

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
            labelFormatter={() => ""}
            formatter={(v: any, name: any, p: any) => {
              const series = String(name);
              const pretty = series === "valor" ? "Valor" : prettifyKey(series);
              const formatted =
                series === "valor" ? formatCurrency(v, "EUR") : formatNumber(v);

              // tenta mostrar quem é o ponto (quando existir label/nome)
              const point = p?.payload;
              const who = point?.label ?? point?.nome ?? point?.jogador;
              if (who && series === "valor") {
                return [`${formatted} — ${String(who)}`, pretty];
              }
              return [formatted, pretty];
            }}
          />

          <Scatter data={cleaned} onClick={onPointClick} fill={SERRANO_COLOR} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ==============================
   KPI
============================== */

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
