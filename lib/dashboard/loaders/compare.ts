import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { WidgetApiResponse, WidgetFilters } from "@/type/dashboard";

/* ============================================================
   BUCKETS DE COMPARAÇÃO
   - PON = PD + PE
   - LAT = LD + LE
============================================================ */

type ComparePos = "GOL" | "ZAG" | "LAT" | "VOL" | "MC" | "MEI" | "PON" | "ATA";

const COMPARE_POSITIONS: ComparePos[] = [
  "GOL",
  "ZAG",
  "LAT",
  "VOL",
  "MC",
  "MEI",
  "PON",
  "ATA",
];

/* ============================================================
   HELPERS
============================================================ */

function ok(widgetId: string, payload: any, filters?: WidgetFilters): WidgetApiResponse {
  return {
    ok: true,
    widgetId: widgetId as any,
    generatedAt: new Date().toISOString(),
    ...(filters ? { filters } : {}),
    payload,
  };
}

function empty(widgetId: string, reason: string, hint?: string): WidgetApiResponse {
  return ok(widgetId, { kind: "empty", reason, ...(hint ? { hint } : {}) });
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ============================================================
   NORMALIZAÇÃO -> BUCKET (SERRANO)
============================================================ */

function serranoPosToBucket(v: unknown): ComparePos | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toUpperCase();
  if (!s) return null;

  // Canônicas do seu projeto
  if (s === "GOL") return "GOL";
  if (s === "ZAG") return "ZAG";

  if (s === "LD" || s === "LE") return "LAT";
  if (s === "PD" || s === "PE") return "PON";

  if (s === "VOL") return "VOL";
  if (s === "MC") return "MC";
  if (s === "MEI") return "MEI";
  if (s === "ATA") return "ATA";

  return null;
}

/* ============================================================
   NORMALIZAÇÃO -> BUCKET (MERCADO)
   Regra: Mercado pode vir "PONTA" e "LATERAL"
============================================================ */

function marketPosToBucket(v: unknown): ComparePos | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toUpperCase();
  if (!s) return null;

  // Mercado já vem assim muitas vezes:
  if (s === "PONTA") return "PON";
  if (s === "LATERAL") return "LAT";

  // Se vier lado, colapsa também
  if (s === "PD" || s === "PE") return "PON";
  if (s === "LD" || s === "LE") return "LAT";

  // Algumas variações mínimas comuns
  const alias: Record<string, ComparePos> = {
    GOLEIRO: "GOL",
    GK: "GOL",

    ZAGUEIRO: "ZAG",
    CB: "ZAG",

    VOLANTE: "VOL",
    DM: "VOL",

    MEIA: "MEI",
    AM: "MEI",

    ATACANTE: "ATA",
    ST: "ATA",

    // Se o CSV vier com isso, já colapsa:
    "LATERAL DIREITO": "LAT",
    "LATERAL ESQUERDO": "LAT",
  };

  if (alias[s]) return alias[s];

  // Se por acaso vier "MC" direto
  if (s === "MC") return "MC";

  return null;
}

/* ============================================================
   FILTROS
============================================================ */

function buildMarketWhere(filters?: WidgetFilters): Prisma.TransferenciaWhereInput {
  const p = filters?.period;
  return {
    ...(p?.from || p?.to
      ? {
          dataTransferencia: {
            ...(p?.from ? { gte: new Date(p.from) } : {}),
            ...(p?.to ? { lte: new Date(p.to) } : {}),
          },
        }
      : {}),
  };
}

function buildSerranoWhere(filters?: WidgetFilters): Prisma.PlayerWhereInput {
  // aqui é seguro filtrar: Player.posicao é canônica no seu schema
  return {
    ...(filters?.position?.length ? { posicao: { in: filters.position } } : {}),
    ...(filters?.agency?.length ? { representacao: { in: filters.agency } } : {}),
    ...(filters?.situation?.length ? { situacao: { in: filters.situation } } : {}),
    ...(filters?.foot?.length ? { peDominante: { in: filters.foot } } : {}),
  };
}

/* ============================================================
   1) compare.position_share_serrano_vs_market
   - agora só existe PON e LAT (no lugar de PD/PE e LD/LE)
============================================================ */

export async function loadComparePositionShare(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  const widgetId = "compare.position_share_serrano_vs_market";

  try {
    const [serranoPlayers, transfers] = await Promise.all([
      prisma.player.findMany({
        where: buildSerranoWhere(filters),
        select: { id: true, posicao: true },
      }),
      prisma.transferencia.findMany({
        where: buildMarketWhere(filters),
        select: { id: true, atletaPosicao: true },
      }),
    ]);

    // init
    const serranoCounts = new Map<ComparePos, number>();
    const serranoIds = new Map<ComparePos, string[]>();
    const marketCounts = new Map<ComparePos, number>();

    for (const p of COMPARE_POSITIONS) {
      serranoCounts.set(p, 0);
      serranoIds.set(p, []);
      marketCounts.set(p, 0);
    }

    // Serrano -> buckets (LD/LE -> LAT, PD/PE -> PON)
    for (const pl of serranoPlayers) {
      const b = serranoPosToBucket(pl.posicao);
      if (!b) continue;
      serranoCounts.set(b, (serranoCounts.get(b) ?? 0) + 1);
      serranoIds.get(b)!.push(pl.id);
    }

    // Mercado -> buckets (LATERAL -> LAT, PONTA -> PON)
    for (const t of transfers) {
      const b = marketPosToBucket(t.atletaPosicao);
      if (!b) continue;
      marketCounts.set(b, (marketCounts.get(b) ?? 0) + 1);
    }

    const totalS = Math.max(1, serranoPlayers.length);
    const totalM = Math.max(1, transfers.length);

    const data = COMPARE_POSITIONS.map((pos) => {
      const serranoPct = Number(((100 * (serranoCounts.get(pos) ?? 0)) / totalS).toFixed(1));
      const marketPct = Number(((100 * (marketCounts.get(pos) ?? 0)) / totalM).toFixed(1));

      return {
        posicao: pos, // agora posicao é GOL/ZAG/LAT/.../PON/ATA
        serranoPct,
        marketPct,
        playerIds: serranoIds.get(pos) ?? [],
      };
    }).sort((a, b) => Math.max(b.serranoPct, b.marketPct) - Math.max(a.serranoPct, a.marketPct));

    const anyNonZero = data.some((d) => d.serranoPct > 0 || d.marketPct > 0);
    if (!anyNonZero) {
      return empty(
        widgetId,
        "Dados insuficientes para comparar posições.",
        "Confira se Player.posicao (Serrano) e Transferencia.atletaPosicao (Mercado) estão preenchidos.",
      );
    }

    return ok(widgetId, { kind: "bar", data }, filters);
  } catch (err) {
    console.error("loadComparePositionShare error", err);
    return { ok: false, widgetId: widgetId as any, error: "Erro no comparativo de posições." };
  }
}

/* ============================================================
   2) compare.avg_age_by_position
   - idem: PON e LAT colapsados
============================================================ */

export async function loadCompareAvgAgeByPosition(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  const widgetId = "compare.avg_age_by_position";

  try {
    const [serrano, transfers] = await Promise.all([
      prisma.player.findMany({
        where: buildSerranoWhere(filters),
        select: { id: true, posicao: true, idade: true },
      }),
      prisma.transferencia.findMany({
        where: buildMarketWhere(filters),
        select: { atletaPosicao: true, atletaIdade: true },
      }),
    ]);

    const sMap = new Map<ComparePos, { sum: number; n: number; ids: string[] }>();
    const mMap = new Map<ComparePos, { sum: number; n: number }>();

    for (const p of COMPARE_POSITIONS) {
      sMap.set(p, { sum: 0, n: 0, ids: [] });
      mMap.set(p, { sum: 0, n: 0 });
    }

    // Serrano
    for (const pl of serrano) {
      const b = serranoPosToBucket(pl.posicao);
      const idade = toFiniteNumber(pl.idade);
      if (!b || idade === null) continue;

      const bucket = sMap.get(b)!;
      bucket.sum += idade;
      bucket.n += 1;
      bucket.ids.push(pl.id);
    }

    // Mercado
    for (const t of transfers) {
      const b = marketPosToBucket(t.atletaPosicao);
      const idade = toFiniteNumber(t.atletaIdade);
      if (!b || idade === null) continue;

      const bucket = mMap.get(b)!;
      bucket.sum += idade;
      bucket.n += 1;
    }

    let data = COMPARE_POSITIONS.map((pos) => {
      const s = sMap.get(pos)!;
      const m = mMap.get(pos)!;

      const serranoAge = s.n > 0 ? Number((s.sum / s.n).toFixed(1)) : null;
      const marketAge = m.n > 0 ? Number((m.sum / m.n).toFixed(1)) : null;

      return {
        posicao: pos,
        serranoAge,
        marketAge,
        playerIds: s.ids,
      };
    }).filter((d) => d.serranoAge !== null || d.marketAge !== null);

    if (!data.length) {
      return empty(
        widgetId,
        "Dados insuficientes para comparar idade média por posição.",
        "Confira se Player.idade (Serrano) e Transferencia.atletaIdade (Mercado) estão preenchidos.",
      );
    }

    data = data.sort(
      (a, b) =>
        Math.max(b.serranoAge ?? 0, b.marketAge ?? 0) -
        Math.max(a.serranoAge ?? 0, a.marketAge ?? 0),
    );

    return ok(widgetId, { kind: "bar", data }, filters);
  } catch (err) {
    console.error("loadCompareAvgAgeByPosition error", err);
    return { ok: false, widgetId: widgetId as any, error: "Erro no comparativo de idade." };
  }
}

/* ============================================================
   DISPATCHER
============================================================ */

export async function loadCompareWidget(
  widgetId: string,
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  switch (widgetId) {
    case "compare.position_share_serrano_vs_market":
      return loadComparePositionShare(filters);

    case "compare.avg_age_by_position":
      return loadCompareAvgAgeByPosition(filters);

    default:
      return empty(widgetId, "Widget comparativo não implementado.");
  }
}
