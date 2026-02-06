// lib/dashboard/loaders/market.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  WidgetApiResponse,
  WidgetFilters,
  BarDatum,
  LineDatum,
  ScatterDatum,
} from "@/type/dashboard";

/**
 * MARKET (unidades)
 * - Transferencia.valor está em EUR (absoluto)
 */

/* -----------------------------
 * Utils
 * ----------------------------- */
function safeStr(v: unknown, fallback = "—") {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  return t.length ? t : fallback;
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Descobre dinamicamente uma coluna “de liga” se existir.
 * (pra fazer filtros e futuros widgets sem depender do schema exato)
 */
async function detectLeagueColumn(): Promise<string | null> {
  const candidates = [
    "ligaClubeDestino",
    "ligaDestino",
    "liga",
    "leagueDestino",
    "league",
    "competicaoDestino",
    "competicao",
  ];

  try {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>(
      Prisma.sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Transferencia'
      `,
    );

    const cols = new Set(rows.map((r) => r.column_name));
    const found = candidates.find((c) => cols.has(c));
    return found ?? null;
  } catch {
    return null;
  }
}

type WhereSqlOpts = {
  leagueCol?: string | null;
};

function buildWhereSql(filters?: WidgetFilters, opts: WhereSqlOpts = {}): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  // período
  if (filters?.period?.from) {
    parts.push(
      Prisma.sql`AND "dataTransferencia" >= ${new Date(filters.period.from)}`,
    );
  }
  if (filters?.period?.to) {
    parts.push(
      Prisma.sql`AND "dataTransferencia" <= ${new Date(filters.period.to)}`,
    );
  }

  // posição (mercado = atletaPosicao)
  if (filters?.position?.length) {
    parts.push(
      Prisma.sql`AND "atletaPosicao" IN (${Prisma.join(filters.position)})`,
    );
  }

  // país destino
  if (filters?.country?.length) {
    parts.push(
      Prisma.sql`AND "paisClubeDestino" IN (${Prisma.join(filters.country)})`,
    );
  }

  // club (origem/destino)
  if (filters?.club?.length) {
    parts.push(Prisma.sql`
      AND (
        "clubeOrigem" IN (${Prisma.join(filters.club)})
        OR
        "clubeDestino" IN (${Prisma.join(filters.club)})
      )
    `);
  }

  // liga (se existir no schema)
  if (filters?.league?.length && opts.leagueCol) {
    const col = Prisma.raw(`"${opts.leagueCol}"`);
    parts.push(Prisma.sql`AND ${col} IN (${Prisma.join(filters.league)})`);
  }

  if (!parts.length) return Prisma.sql``;
  return Prisma.sql`${Prisma.join(parts, " ")}`;
}

/* -----------------------------
 * market.deals_by_month
 * ----------------------------- */
export async function loadMarketDealsByMonth(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const leagueCol = filters?.league?.length ? await detectLeagueColumn() : null;
    const whereSql = buildWhereSql(filters, { leagueCol });

    const rows = await prisma.$queryRaw<
      { year: number; month: number; deals: number }[]
    >(Prisma.sql`
      SELECT
        EXTRACT(YEAR FROM "dataTransferencia")::int AS year,
        EXTRACT(MONTH FROM "dataTransferencia")::int AS month,
        COUNT(*)::int AS deals
      FROM "Transferencia"
      WHERE "dataTransferencia" IS NOT NULL
      ${whereSql}
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `);

    if (!rows.length) {
      return {
        ok: true,
        widgetId: "market.deals_by_month",
        generatedAt: new Date().toISOString(),
        payload: { kind: "empty", reason: "Nenhuma transação no período selecionado." },
      };
    }

    const data: LineDatum[] = rows.map((r) => ({
      period: `${r.year}-${String(r.month).padStart(2, "0")}`,
      deals: r.deals,
    }));

    return {
      ok: true,
      widgetId: "market.deals_by_month",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "line", data },
    };
  } catch (err) {
    console.error("loadMarketDealsByMonth error", err);
    return {
      ok: false,
      widgetId: "market.deals_by_month",
      error: "Erro ao carregar transações por mês.",
    };
  }
}

/* -----------------------------
 * market.fee_by_month
 * ----------------------------- */
export async function loadMarketFeeByMonth(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const leagueCol = filters?.league?.length ? await detectLeagueColumn() : null;
    const whereSql = buildWhereSql(filters, { leagueCol });

    const rows = await prisma.$queryRaw<
      { year: number; month: number; value: number }[]
    >(Prisma.sql`
      SELECT
        EXTRACT(YEAR FROM "dataTransferencia")::int AS year,
        EXTRACT(MONTH FROM "dataTransferencia")::int AS month,
        SUM("valor")::float8 AS value
      FROM "Transferencia"
      WHERE "dataTransferencia" IS NOT NULL
        AND "valor" IS NOT NULL
        AND "valor" > 0
      ${whereSql}
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `);

    if (!rows.length) {
      return {
        ok: true,
        widgetId: "market.fee_by_month",
        generatedAt: new Date().toISOString(),
        payload: { kind: "empty", reason: "Nenhum valor movimentado no período." },
      };
    }

    const data: BarDatum[] = rows.map((r) => ({
      period: `${r.year}-${String(r.month).padStart(2, "0")}`,
      value: r.value,
    }));

    return {
      ok: true,
      widgetId: "market.fee_by_month",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "bar", data },
    };
  } catch (err) {
    console.error("loadMarketFeeByMonth error", err);
    return {
      ok: false,
      widgetId: "market.fee_by_month",
      error: "Erro ao carregar valores por mês.",
    };
  }
}

/* -----------------------------
 * market.fee_distribution
 * ----------------------------- */
export async function loadMarketFeeDistribution(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const leagueCol = filters?.league?.length ? await detectLeagueColumn() : null;
    const whereSql = buildWhereSql(filters, { leagueCol });

    const rows = await prisma.$queryRaw<{ valor: number }[]>(
      Prisma.sql`
        SELECT "valor"::float8 AS valor
        FROM "Transferencia"
        WHERE 1=1
          AND "valor" IS NOT NULL
          AND "valor" > 0
        ${whereSql}
      `,
    );

    const values = rows
      .map((r) => toFiniteNumber(r.valor))
      .filter((v): v is number => v !== null);

    if (!values.length) {
      return {
        ok: true,
        widgetId: "market.fee_distribution",
        generatedAt: new Date().toISOString(),
        payload: { kind: "empty", reason: "Sem valores de transferência para montar a distribuição." },
      };
    }

    const bins = [
      { label: "≤ 0.5M", min: -Infinity, max: 0.5e6 },
      { label: "0.5–2M", min: 0.5e6, max: 2e6 },
      { label: "2–5M", min: 2e6, max: 5e6 },
      { label: "5–10M", min: 5e6, max: 10e6 },
      { label: "10–20M", min: 10e6, max: 20e6 },
      { label: "20M+", min: 20e6, max: Infinity },
    ];

    const counts: Record<string, number> = Object.fromEntries(
      bins.map((b) => [b.label, 0]),
    );

    for (const v of values) {
      const b = bins.find((x) => v > x.min && v <= x.max);
      if (b) counts[b.label]++;
    }

    const data: BarDatum[] = bins.map((b) => ({
      faixa: b.label,
      transferencias: counts[b.label] ?? 0,
    }));

    return {
      ok: true,
      widgetId: "market.fee_distribution",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "bar", data },
    };
  } catch (err) {
    console.error("loadMarketFeeDistribution error", err);
    return {
      ok: false,
      widgetId: "market.fee_distribution",
      error: "Erro ao carregar distribuição de valores.",
    };
  }
}

/* -----------------------------
 * market.top_buyers_sellers
 * (corrige “clubes sem dados”: só entra se SUM(valor) > 0)
 * ----------------------------- */
export async function loadMarketTopBuyersSellers(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const leagueCol = filters?.league?.length ? await detectLeagueColumn() : null;
    const whereSql = buildWhereSql(filters, { leagueCol });

    const buyers = await prisma.$queryRaw<{ clube: string; total: number }[]>(
      Prisma.sql`
        SELECT
          TRIM("clubeDestino") AS clube,
          SUM("valor")::float8 AS total
        FROM "Transferencia"
        WHERE 1=1
          AND "clubeDestino" IS NOT NULL
          AND TRIM("clubeDestino") <> ''
          AND "valor" IS NOT NULL
          AND "valor" > 0
        ${whereSql}
        GROUP BY TRIM("clubeDestino")
        HAVING SUM("valor") > 0
        ORDER BY total DESC
        LIMIT 12
      `,
    );

    const sellers = await prisma.$queryRaw<{ clube: string; total: number }[]>(
      Prisma.sql`
        SELECT
          TRIM("clubeOrigem") AS clube,
          SUM("valor")::float8 AS total
        FROM "Transferencia"
        WHERE 1=1
          AND "clubeOrigem" IS NOT NULL
          AND TRIM("clubeOrigem") <> ''
          AND "valor" IS NOT NULL
          AND "valor" > 0
        ${whereSql}
        GROUP BY TRIM("clubeOrigem")
        HAVING SUM("valor") > 0
        ORDER BY total DESC
        LIMIT 12
      `,
    );

    const map = new Map<
      string,
      { clube: string; compradores: number; vendedores: number }
    >();

    for (const b of buyers) {
      map.set(safeStr(b.clube), {
        clube: safeStr(b.clube),
        compradores: toFiniteNumber(b.total) ?? 0,
        vendedores: 0,
      });
    }

    for (const s of sellers) {
      const key = safeStr(s.clube);
      const prev = map.get(key);
      if (prev) prev.vendedores = toFiniteNumber(s.total) ?? 0;
      else {
        map.set(key, {
          clube: key,
          compradores: 0,
          vendedores: toFiniteNumber(s.total) ?? 0,
        });
      }
    }

    const data = Array.from(map.values())
      .filter((r) => (r.compradores ?? 0) > 0 || (r.vendedores ?? 0) > 0)
      .sort(
        (a, b) =>
          Math.max(b.compradores, b.vendedores) -
          Math.max(a.compradores, a.vendedores),
      )
      .slice(0, 12) as unknown as BarDatum[];

    if (!data.length) {
      return {
        ok: true,
        widgetId: "market.top_buyers_sellers",
        generatedAt: new Date().toISOString(),
        payload: { kind: "empty", reason: "Sem volume financeiro suficiente para ranking." },
      };
    }

    return {
      ok: true,
      widgetId: "market.top_buyers_sellers",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "bar", data },
    };
  } catch (err) {
    console.error("loadMarketTopBuyersSellers error", err);
    return {
      ok: false,
      widgetId: "market.top_buyers_sellers",
      error: "Erro ao carregar ranking de clubes.",
    };
  }
}

/* -----------------------------
 * market.top_leagues_countries
 * (corrige dataset “confuso” pro renderer: devolve SÓ 1 métrica numérica)
 * -> por enquanto: TOP PAÍSES por deals.
 * ----------------------------- */
export async function loadMarketTopLeaguesCountries(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const leagueCol = filters?.league?.length ? await detectLeagueColumn() : null;
    const whereSql = buildWhereSql(filters, { leagueCol });

    const rows = await prisma.$queryRaw<{ label: string; deals: number }[]>(
      Prisma.sql`
        SELECT
          COALESCE(NULLIF(TRIM("paisClubeDestino"), ''), '—') AS label,
          COUNT(*)::int AS deals
        FROM "Transferencia"
        WHERE 1=1
        ${whereSql}
        GROUP BY label
        ORDER BY deals DESC
        LIMIT 12
      `,
    );

    if (!rows.length) {
      return {
        ok: true,
        widgetId: "market.top_leagues_countries",
        generatedAt: new Date().toISOString(),
        payload: { kind: "empty", reason: "Sem dados suficientes para distribuição." },
      };
    }

    // ✅ só 1 chave numérica: "deals" (evita o renderer pegar label errado)
    const data: BarDatum[] = rows.map((r) => ({
      label: safeStr(r.label),
      deals: r.deals,
    })) as any;

    return {
      ok: true,
      widgetId: "market.top_leagues_countries",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "bar", data },
    };
  } catch (err) {
    console.error("loadMarketTopLeaguesCountries error", err);
    return {
      ok: false,
      widgetId: "market.top_leagues_countries",
      error: "Erro ao carregar países/ligas.",
    };
  }
}

/* -----------------------------
 * market.age_vs_fee_scatter
 * (dados limpos + ordenação por idade)
 * ----------------------------- */
export async function loadMarketAgeVsFeeScatter(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const leagueCol = filters?.league?.length ? await detectLeagueColumn() : null;
    const whereSql = buildWhereSql(filters, { leagueCol });

    const rows = await prisma.$queryRaw<
      { idade: number | null; valor: number | null; posicao: string | null; label: string | null }[]
    >(Prisma.sql`
      SELECT
        "atletaIdade"::int AS idade,
        "valor"::float8 AS valor,
        NULLIF(TRIM("atletaPosicao"), '') AS posicao,
        NULLIF(TRIM("atletaNome"), '') AS label
      FROM "Transferencia"
      WHERE 1=1
        ${whereSql}
        AND "atletaIdade" IS NOT NULL
        AND "valor" IS NOT NULL
        AND "valor" > 0
      LIMIT 800
    `);

    const data: ScatterDatum[] = rows
      .map((r) => {
        const idade = toFiniteNumber(r.idade);
        const valor = toFiniteNumber(r.valor);
        if (idade === null || valor === null) return null;

        // sanity: remove idade absurda (evita lixo)
        if (idade < 10 || idade > 45) return null;

        return {
          idade,
          valor,
          posicao: safeStr(r.posicao, ""),
          label: safeStr(r.label, ""),
        } satisfies ScatterDatum;
      })
      .filter(Boolean) as ScatterDatum[];

    if (!data.length) {
      return {
        ok: true,
        widgetId: "market.age_vs_fee_scatter",
        generatedAt: new Date().toISOString(),
        payload: {
          kind: "empty",
          reason: "Dados insuficientes para o gráfico (idade/valor).",
          hint: "Verifique se 'atletaIdade' e 'valor' estão preenchidos nas transferências.",
        },
      };
    }

    return {
      ok: true,
      widgetId: "market.age_vs_fee_scatter",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "scatter", data },
    };
  } catch (err) {
    console.error("loadMarketAgeVsFeeScatter error", err);
    return {
      ok: false,
      widgetId: "market.age_vs_fee_scatter",
      error: "Erro ao carregar scatter idade vs valor da transferência.",
    };
  }
}

/* -----------------------------
 * market.position_avg_fee
 * ----------------------------- */
export async function loadMarketPositionAvgFee(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const leagueCol = filters?.league?.length ? await detectLeagueColumn() : null;
    const whereSql = buildWhereSql(filters, { leagueCol });

    const rows = await prisma.$queryRaw<{ posicao: string; avg: number; deals: number }[]>(
      Prisma.sql`
        SELECT
          COALESCE(NULLIF(TRIM("atletaPosicao"), ''), '—') AS posicao,
          AVG("valor")::float8 AS avg,
          COUNT(*)::int AS deals
        FROM "Transferencia"
        WHERE 1=1
          AND "valor" IS NOT NULL
          AND "valor" > 0
        ${whereSql}
        GROUP BY posicao
        ORDER BY avg DESC
      `,
    );

    if (!rows.length) {
      return {
        ok: true,
        widgetId: "market.position_avg_fee",
        generatedAt: new Date().toISOString(),
        payload: { kind: "empty", reason: "Sem dados por posição." },
      };
    }

    const data: BarDatum[] = rows.map((r) => ({
      posicao: safeStr(r.posicao),
      valorMedio: r.avg,
      deals: r.deals,
    }));

    return {
      ok: true,
      widgetId: "market.position_avg_fee",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "bar", data },
    };
  } catch (err) {
    console.error("loadMarketPositionAvgFee error", err);
    return {
      ok: false,
      widgetId: "market.position_avg_fee",
      error: "Erro ao carregar valor médio por posição.",
    };
  }
}

/* -----------------------------
 * Dispatcher
 * ----------------------------- */
export async function loadMarketWidget(
  widgetId: string,
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  switch (widgetId) {
    case "market.deals_by_month":
      return loadMarketDealsByMonth(filters);

    case "market.fee_by_month":
      return loadMarketFeeByMonth(filters);

    case "market.fee_distribution":
      return loadMarketFeeDistribution(filters);

    case "market.top_buyers_sellers":
      return loadMarketTopBuyersSellers(filters);

    case "market.top_leagues_countries":
      return loadMarketTopLeaguesCountries(filters);

    case "market.age_vs_fee_scatter":
      return loadMarketAgeVsFeeScatter(filters);

    case "market.position_avg_fee":
      return loadMarketPositionAvgFee(filters);

    default:
      return {
        ok: true,
        widgetId: widgetId as any,
        generatedAt: new Date().toISOString(),
        payload: { kind: "empty", reason: "Widget ainda não implementado." },
      };
  }
}
