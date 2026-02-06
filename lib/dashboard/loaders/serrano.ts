// lib/dashboard/loaders/serrano.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  WidgetApiResponse,
  WidgetFilters,
  BarDatum,
  ScatterDatum,
} from "@/type/dashboard";

/**
 * BASE DO SERRANO (conceito do produto)
 * ------------------------------------
 * serrano.* = TODOS os jogadores da base (sem filtro por clubeId)
 * (clubeId do player é o clube atual do atleta, não "Serrano")
 *
 * IMPORTANTE (unidades):
 * - Player.valorMercado está em MILHÕES de EUR (ex: 2 => €2.000.000)
 */
const SERRANO_MARKET_VALUE_SCALE = 1_000_000;

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function scaleMarketValueMillionsToEur(v: unknown): number | null {
  const n = toFiniteNumber(v);
  if (n === null) return null;
  return n * SERRANO_MARKET_VALUE_SCALE;
}

function safeStr(v: unknown, fallback = "—") {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  return t.length ? t : fallback;
}

function buildBaseWhere(filters?: WidgetFilters): Prisma.PlayerWhereInput {
  return {
    ...(filters?.position?.length ? { posicao: { in: filters.position } } : {}),
    ...(filters?.agency?.length ? { representacao: { in: filters.agency } } : {}),
    ...(filters?.situation?.length ? { situacao: { in: filters.situation } } : {}),
    ...(filters?.foot?.length ? { peDominante: { in: filters.foot } } : {}),
  };
}

/**
 * Bins de idade (coerentes com base que tem jogador de 11 anos)
 * - Ajustáveis depois, mas já ficam “humanos” e úteis
 */
const AGE_BINS = [
  { label: "≤11", min: -Infinity, max: 11 },
  { label: "12–14", min: 12, max: 14 },
  { label: "15–17", min: 15, max: 17 },
  { label: "18–20", min: 18, max: 20 },
  { label: "21–23", min: 21, max: 23 },
  { label: "24–27", min: 24, max: 27 },
  { label: "28+", min: 28, max: Infinity },
] as const;

/**
 * serrano.age_distribution
 * Distribuição de idades (bins)
 */
export async function loadSerranoAgeDistribution(
  filters?: WidgetFilters
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const players = await prisma.player.findMany({
      where,
      select: { idade: true },
    });

    const ages = players
      .map((p) => toFiniteNumber(p.idade))
      .filter((v): v is number => v !== null);

    if (!ages.length) {
      return {
        ok: true,
        widgetId: "serrano.age_distribution",
        generatedAt: new Date().toISOString(),
        payload: {
          kind: "empty",
          reason: "Nenhum jogador encontrado com os filtros aplicados.",
          hint: "Verifique se há jogadores com idade preenchida.",
        },
      };
    }

    const counts: Record<string, number> = Object.fromEntries(
      AGE_BINS.map((b) => [b.label, 0])
    );

    for (const age of ages) {
      const bin = AGE_BINS.find((b) => age >= b.min && age <= b.max);
      if (bin) counts[bin.label]++;
    }

    const data: BarDatum[] = AGE_BINS.map((b) => ({
      faixa: b.label,
      jogadores: counts[b.label] ?? 0,
    }));

    return {
      ok: true,
      widgetId: "serrano.age_distribution",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "bar", data },
    };
  } catch (err) {
    console.error("loadSerranoAgeDistribution error", err);
    return {
      ok: false,
      widgetId: "serrano.age_distribution",
      error: "Erro ao carregar distribuição de idades.",
    };
  }
}

/**
 * serrano.position_distribution
 * Distribuição por posição (count)
 */
export async function loadSerranoPositionDistribution(
  filters?: WidgetFilters
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const rows = await prisma.player.findMany({
      where,
      select: { posicao: true },
    });

    const positions = rows
      .map((r) => safeStr(r.posicao, ""))
      .map((s) => s.trim())
      .filter(Boolean);

    if (!positions.length) {
      return {
        ok: true,
        widgetId: "serrano.position_distribution",
        generatedAt: new Date().toISOString(),
        payload: {
          kind: "empty",
          reason: "Nenhuma posição encontrada com os filtros aplicados.",
          hint: "Verifique se os jogadores têm o campo 'posicao' preenchido.",
        },
      };
    }

    const counts = new Map<string, number>();
    for (const pos of positions) counts.set(pos, (counts.get(pos) ?? 0) + 1);

    const data: BarDatum[] = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([posicao, jogadores]) => ({ posicao, jogadores }));

    return {
      ok: true,
      widgetId: "serrano.position_distribution",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "bar", data },
    };
  } catch (err) {
    console.error("loadSerranoPositionDistribution error", err);
    return {
      ok: false,
      widgetId: "serrano.position_distribution",
      error: "Erro ao carregar distribuição por posição.",
    };
  }
}

/**
 * serrano.market_value_top_players
 * (valorMercado em MILHÕES -> EUR absoluto)
 */
export async function loadSerranoTopMarketValuePlayers(
  filters?: WidgetFilters,
  topN = 10
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const players = await prisma.player.findMany({
      where,
      orderBy: { valorMercado: "desc" },
      take: topN,
      select: { nome: true, valorMercado: true, posicao: true },
    });

    const data: BarDatum[] = players
      .map((p) => {
        const eur = scaleMarketValueMillionsToEur(p.valorMercado);
        if (eur === null) return null;

        return {
          jogador: safeStr(p.nome, "—"),
          valor: eur,
          posicao: safeStr(p.posicao, ""),
        } satisfies BarDatum as any;
      })
      .filter(Boolean) as any[];

    if (!data.length) {
      return {
        ok: true,
        widgetId: "serrano.market_value_top_players",
        generatedAt: new Date().toISOString(),
        payload: {
          kind: "empty",
          reason: "Nenhum jogador com valor de mercado encontrado.",
          hint: "Verifique se 'valorMercado' está preenchido.",
        },
      };
    }

    return {
      ok: true,
      widgetId: "serrano.market_value_top_players",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "bar", data },
    };
  } catch (err) {
    console.error("loadSerranoTopMarketValuePlayers error", err);
    return {
      ok: false,
      widgetId: "serrano.market_value_top_players",
      error: "Erro ao carregar ranking de jogadores.",
    };
  }
}

/**
 * serrano.age_vs_value_scatter
 * (valorMercado em MILHÕES -> EUR absoluto)
 */
export async function loadSerranoAgeVsValueScatter(
  filters?: WidgetFilters
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const players = await prisma.player.findMany({
      where,
      select: { nome: true, idade: true, valorMercado: true, posicao: true },
      take: 800,
    });

    const data: ScatterDatum[] = players
      .map((p) => {
        const idade = toFiniteNumber(p.idade);
        const valor = scaleMarketValueMillionsToEur(p.valorMercado);
        if (idade === null || valor === null) return null;

        return {
          idade,
          valor,
          posicao: safeStr(p.posicao, ""),
          label: safeStr(p.nome, ""),
        } satisfies ScatterDatum;
      })
      .filter(Boolean) as ScatterDatum[];

    if (!data.length) {
      return {
        ok: true,
        widgetId: "serrano.age_vs_value_scatter",
        generatedAt: new Date().toISOString(),
        payload: {
          kind: "empty",
          reason: "Dados insuficientes para o gráfico.",
          hint: "Preencha 'idade' e 'valorMercado' em mais jogadores.",
        },
      };
    }

    return {
      ok: true,
      widgetId: "serrano.age_vs_value_scatter",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "scatter", data },
    };
  } catch (err) {
    console.error("loadSerranoAgeVsValueScatter error", err);
    return {
      ok: false,
      widgetId: "serrano.age_vs_value_scatter",
      error: "Erro ao carregar scatter idade vs valor.",
    };
  }
}

/**
 * serrano.representation_ranking
 * Ranking por contagem
 */
export async function loadSerranoRepresentationRanking(
  filters?: WidgetFilters,
  topN = 10
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const rows = await prisma.player.findMany({
      where,
      select: { representacao: true },
    });

    const reps = rows
      .map((r) => safeStr(r.representacao, ""))
      .map((s) => s.trim())
      .filter(Boolean);

    if (!reps.length) {
      return {
        ok: true,
        widgetId: "serrano.representation_ranking",
        generatedAt: new Date().toISOString(),
        payload: {
          kind: "empty",
          reason: "Sem dados de agência/representação.",
          hint: "Verifique se 'representacao' está preenchido nos jogadores.",
        },
      };
    }

    const counts = new Map<string, number>();
    for (const r of reps) counts.set(r, (counts.get(r) ?? 0) + 1);

    const data: BarDatum[] = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([agencia, jogadores]) => ({
        agencia,
        jogadores,
        // opcional (se você quiser usar no renderer depois):
        agenciaShort: agencia.length > 18 ? agencia.slice(0, 18) + "…" : agencia,
      })) as any;

    return {
      ok: true,
      widgetId: "serrano.representation_ranking",
      generatedAt: new Date().toISOString(),
      filters,
      payload: { kind: "bar", data },
    };
  } catch (err) {
    console.error("loadSerranoRepresentationRanking error", err);
    return {
      ok: false,
      widgetId: "serrano.representation_ranking",
      error: "Erro ao carregar ranking de agências.",
    };
  }
}

/**
 * DISPATCHER
 */
export async function loadSerranoWidget(
  widgetId: string,
  filters?: WidgetFilters
): Promise<WidgetApiResponse> {
  switch (widgetId) {
    case "serrano.age_distribution":
      return loadSerranoAgeDistribution(filters);

    case "serrano.position_distribution":
      return loadSerranoPositionDistribution(filters);

    case "serrano.market_value_top_players":
      return loadSerranoTopMarketValuePlayers(filters);

    case "serrano.age_vs_value_scatter":
      return loadSerranoAgeVsValueScatter(filters);

    case "serrano.representation_ranking":
      return loadSerranoRepresentationRanking(filters);

    default:
      return {
        ok: true,
        widgetId: widgetId as any,
        generatedAt: new Date().toISOString(),
        payload: { kind: "empty", reason: "Widget do Serrano ainda não implementado." },
      };
  }
}
