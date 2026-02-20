// app/api/dashboard/kpis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { KpisApiResponse, WidgetScope, KpiDatum } from "@/type/dashboard";

type Scope = WidgetScope;

const SERRANO_MARKET_VALUE_SCALE = 1_000_000; // valorMercado vem em milhões de EUR

function toNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function kpi(label: string, value: number | null, unit?: string): KpiDatum {
  return { label, value, unit };
}

export async function GET(req: NextRequest) {
  try {
    const scope = (req.nextUrl.searchParams.get("scope") ?? "both") as Scope;

    const serranoEnabled = scope !== "market";
    const marketEnabled = scope !== "serrano";

    // MARKET
    const marketCountPromise = marketEnabled
      ? prisma.transferencia.count({
          where: { dataTransferencia: { not: null } },
        })
      : Promise.resolve(null);

    const marketAggPromise = marketEnabled
      ? prisma.transferencia.aggregate({
          where: {
            dataTransferencia: { not: null },
            valor: { not: null },
          },
          _sum: { valor: true },
          _avg: { valor: true },
        })
      : Promise.resolve(null);

    // deals_per_month = deals / meses distintos com dados
    const marketDealsPerMonthPromise = marketEnabled
      ? prisma.$queryRaw<{ deals: number; months: number }[]>(
          Prisma.sql`
            SELECT
              COUNT(*)::int AS deals,
              COUNT(DISTINCT DATE_TRUNC('month', "dataTransferencia"))::int AS months
            FROM "Transferencia"
            WHERE "dataTransferencia" IS NOT NULL
          `,
        )
      : Promise.resolve(null);

    // SERRANO
    const playersCountPromise = serranoEnabled
      ? prisma.player.count()
      : Promise.resolve(null);

    const playersTotalValuePromise = serranoEnabled
      ? prisma.player.aggregate({ _sum: { valorMercado: true } })
      : Promise.resolve(null);

    const playersAvgAgePromise = serranoEnabled
      ? prisma.player.aggregate({ _avg: { idade: true } })
      : Promise.resolve(null);

    // Valor atribuído ao Serrano (ponderado por possePct)
    // SUM(valorMercado(milhões)->EUR * possePct/100)
    const serranoWeightedValuePromise = serranoEnabled
      ? prisma.$queryRaw<{ weighted: number | null }[]>(
          Prisma.sql`
            SELECT
              SUM(
                ("valorMercado"::float8 * ${SERRANO_MARKET_VALUE_SCALE}::float8) * ("possePct"::float8 / 100.0)
              )::float8 AS weighted
            FROM "Player"
            WHERE "valorMercado" IS NOT NULL
              AND "possePct" IS NOT NULL
          `,
        )
      : Promise.resolve(null);

    const [
      marketCount,
      marketAgg,
      marketDealsPerMonthRows,
      playersCount,
      playersTotalValue,
      playersAvgAge,
      serranoWeightedRows,
    ] = await Promise.all([
      marketCountPromise,
      marketAggPromise,
      marketDealsPerMonthPromise,
      playersCountPromise,
      playersTotalValuePromise,
      playersAvgAgePromise,
      serranoWeightedValuePromise,
    ]);

    // MARKET (valores em EUR absoluto)
    const marketTotalFee = toNumber((marketAgg as any)?._sum?.valor) ?? 0;
    const marketAvgFee = toNumber((marketAgg as any)?._avg?.valor) ?? 0;

    // deals/mês (1 casa decimal)
    const dealsPerMonthRow = Array.isArray(marketDealsPerMonthRows)
      ? marketDealsPerMonthRows[0]
      : null;

    const deals = toNumber((dealsPerMonthRow as any)?.deals) ?? 0;
    const months = toNumber((dealsPerMonthRow as any)?.months) ?? 0;
    const dealsPerMonth =
      months > 0 ? Math.round(((deals / months) * 10)) / 10 : 0;

    // SERRANO
    const serranoPlayersCount = toNumber(playersCount);

    const serranoTotalMarketValueRaw = toNumber(
      (playersTotalValue as any)?._sum?.valorMercado,
    );

    const serranoTotalMarketValueEur =
      serranoTotalMarketValueRaw === null
        ? null
        : serranoTotalMarketValueRaw * SERRANO_MARKET_VALUE_SCALE;

    const serranoAvgAge = toNumber((playersAvgAge as any)?._avg?.idade);

    const serranoWeightedRow = Array.isArray(serranoWeightedRows)
      ? serranoWeightedRows[0]
      : null;

    const serranoWeightedValue = toNumber((serranoWeightedRow as any)?.weighted);

    const kpis: Record<string, KpiDatum> = {
      // Serrano
      "serrano.players_count": kpi(
        "Jogadores do Serrano",
        serranoEnabled ? (serranoPlayersCount ?? 0) : null,
      ),

      "serrano.total_market_value": kpi(
        "Valor de mercado total",
        serranoEnabled ? (serranoTotalMarketValueEur ?? 0) : null,
        "EUR",
      ),

      "serrano.avg_age": kpi(
        "Idade média",
        serranoEnabled ? (serranoAvgAge ?? 0) : null,
      ),

      "serrano.total_market_value_weighted": kpi(
        "Valor atribuído ao Serrano",
        serranoEnabled ? (serranoWeightedValue ?? 0) : null,
        "EUR",
      ),

      // Market
      "market.deals_count": kpi(
        "Transações no mercado",
        marketEnabled ? (toNumber(marketCount) ?? 0) : null,
      ),

      "market.total_fee": kpi(
        "Volume financeiro do mercado",
        marketEnabled ? marketTotalFee : null,
        "EUR",
      ),

      "market.avg_fee": kpi(
        "Ticket médio",
        marketEnabled ? marketAvgFee : null,
        "EUR",
      ),

      "market.deals_per_month": kpi(
        "Transações/mês",
        marketEnabled ? dealsPerMonth : null,
        "deals/mês",
      ),
    };

    const res: KpisApiResponse = {
      ok: true,
      generatedAt: new Date().toISOString(),
      scope,
      kpis,
    };

    return NextResponse.json(res, { status: 200 });
  } catch (err) {
    console.error("KPIs route error", err);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao carregar KPIs." } satisfies KpisApiResponse,
      { status: 200 },
    );
  }
}
