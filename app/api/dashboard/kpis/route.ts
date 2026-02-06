// app/api/dashboard/kpis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const marketCountPromise = marketEnabled
      ? prisma.transferencia.count()
      : Promise.resolve(null);

    const marketAggPromise = marketEnabled
      ? prisma.transferencia.aggregate({
          _sum: { valor: true },
          _avg: { valor: true },
        })
      : Promise.resolve(null);

    const playersCountPromise = serranoEnabled
      ? prisma.player.count()
      : Promise.resolve(null);

    const playersTotalValuePromise = serranoEnabled
      ? prisma.player.aggregate({ _sum: { valorMercado: true } })
      : Promise.resolve(null);

    const playersAvgAgePromise = serranoEnabled
      ? prisma.player.aggregate({ _avg: { idade: true } })
      : Promise.resolve(null);

    const [
      marketCount,
      marketAgg,
      playersCount,
      playersTotalValue,
      playersAvgAge,
    ] = await Promise.all([
      marketCountPromise,
      marketAggPromise,
      playersCountPromise,
      playersTotalValuePromise,
      playersAvgAgePromise,
    ]);

    // MARKET (valores já em EUR absoluto)
    const marketTotalFee = toNumber((marketAgg as any)?._sum?.valor) ?? 0;
    const marketAvgFee = toNumber((marketAgg as any)?._avg?.valor) ?? 0;

    // SERRANO (valorMercado em milhões -> EUR absoluto)
    const serranoPlayersCount = toNumber(playersCount);

    const serranoTotalMarketValueRaw = toNumber(
      (playersTotalValue as any)?._sum?.valorMercado
    );

    const serranoTotalMarketValueEur =
      serranoTotalMarketValueRaw === null
        ? null
        : serranoTotalMarketValueRaw * SERRANO_MARKET_VALUE_SCALE;

    const serranoAvgAge = toNumber((playersAvgAge as any)?._avg?.idade);

    const kpis: Record<string, KpiDatum> = {
      "serrano.players_count": kpi(
        "Jogadores do Serrano",
        serranoEnabled ? (serranoPlayersCount ?? 0) : null
      ),

      "serrano.total_market_value": kpi(
        "Valor de mercado total",
        serranoEnabled ? (serranoTotalMarketValueEur ?? 0) : null,
        "EUR"
      ),

      "serrano.avg_age": kpi(
        "Idade média",
        serranoEnabled ? (serranoAvgAge ?? 0) : null
      ),

      "market.deals_count": kpi(
        "Transações no mercado",
        marketEnabled ? (toNumber(marketCount) ?? 0) : null
      ),

      "market.total_fee": kpi(
        "Volume financeiro do mercado",
        marketEnabled ? marketTotalFee : null,
        "EUR"
      ),

      "market.avg_fee": kpi(
        "Ticket médio",
        marketEnabled ? marketAvgFee : null,
        "EUR"
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
      { status: 200 }
    );
  }
}
