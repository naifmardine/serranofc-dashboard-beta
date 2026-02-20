import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
 *
 * IMPORTANTE (unidades):
 * - Player.valorMercado está em MILHÕES de EUR (ex: 2 => €2.000.000)
 */

const SERRANO_MARKET_VALUE_SCALE = 1_000_000;

/* ------------------------------------------------------------------ */
/* Utils */
/* ------------------------------------------------------------------ */

const toFiniteNumber = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const scaleMarketValueMillionsToEur = (v: unknown): number | null => {
  const n = toFiniteNumber(v);
  if (n === null) return null;
  return n * SERRANO_MARKET_VALUE_SCALE;
};

const safeStr = (v: unknown, fallback = "—") => {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  return t.length ? t : fallback;
};

/**
 * Filtros do dashboard (Serrano)
 * - Estes campos precisam existir no model Player do Prisma.
 */
function buildBaseWhere(filters?: WidgetFilters): Prisma.PlayerWhereInput {
  return {
    ...(filters?.position?.length ? { posicao: { in: filters.position } } : {}),
    ...(filters?.agency?.length
      ? { representacao: { in: filters.agency } }
      : {}),
    ...(filters?.situation?.length
      ? { situacao: { in: filters.situation } }
      : {}),
    ...(filters?.foot?.length ? { peDominante: { in: filters.foot } } : {}),
  };
}

const ok = (
  widgetId: string,
  payload: any,
  filters?: WidgetFilters,
): WidgetApiResponse => ({
  ok: true,
  widgetId: widgetId as any,
  generatedAt: new Date().toISOString(),
  ...(filters ? { filters } : {}),
  payload,
});

const empty = (
  widgetId: string,
  reason: string,
  hint?: string,
): WidgetApiResponse =>
  ok(widgetId, { kind: "empty", reason, ...(hint ? { hint } : {}) });

/**
 * Agrupa IDs por chave (evita N queries)
 */
const groupIdsByKey = (rows: Array<{ id: string; key: string }>) => {
  const m = new Map<string, string[]>();
  for (const r of rows) {
    const k = r.key;
    const arr = m.get(k) ?? [];
    arr.push(r.id);
    m.set(k, arr);
  }
  return m;
};

/* ------------------------------------------------------------------ */
/* serrano.age_distribution (toggle: Idade / Ano de nascimento) */
/* + drilldown: playerIds por bucket */
/* ------------------------------------------------------------------ */

const AGE_BINS = [
  { label: "≤11", min: -Infinity, max: 11 },
  { label: "12–14", min: 12, max: 14 },
  { label: "15–17", min: 15, max: 17 },
  { label: "18–20", min: 18, max: 20 },
  { label: "21–23", min: 21, max: 23 },
  { label: "24–27", min: 24, max: 27 },
  { label: "28+", min: 28, max: Infinity },
] as const;

const isValidBirthYear = (y: number) => {
  const now = new Date().getFullYear();
  return y >= 1980 && y <= now;
};

const findAgeBinLabel = (age: number): string | null => {
  const bin = AGE_BINS.find((b) => age >= b.min && age <= b.max);
  return bin ? bin.label : null;
};

const buildAgeBinsDataWithIds = (
  items: Array<{ id: string; idade: number }>,
): BarDatum[] => {
  const idsByBin = new Map<string, string[]>();
  for (const b of AGE_BINS) idsByBin.set(b.label, []);

  for (const it of items) {
    const label = findAgeBinLabel(it.idade);
    if (!label) continue;
    idsByBin.get(label)!.push(it.id);
  }

  return AGE_BINS.map((b) => ({
    faixa: b.label,
    jogadores: idsByBin.get(b.label)?.length ?? 0,
    playerIds: idsByBin.get(b.label) ?? [],
  })) as any;
};

/**
 * Ano de nascimento:
 * - se poucos anos únicos (<= 18): cada ano vira uma barra (com playerIds)
 * - se muitos: buckets de 5 anos (com playerIds)
 */
const buildBirthYearDataWithIds = (
  items: Array<{ id: string; anoNascimento: number }>,
): BarDatum[] => {
  const cleaned = items
    .map((it) => ({ id: it.id, y: Math.trunc(it.anoNascimento) }))
    .filter((it) => Number.isFinite(it.y) && isValidBirthYear(it.y));

  if (!cleaned.length) return [];

  const years = Array.from(new Set(cleaned.map((x) => x.y))).sort(
    (a, b) => a - b,
  );

  // Caso 1: poucos anos -> por ano
  if (years.length <= 18) {
    const idsByYear = new Map<number, string[]>();
    for (const y of years) idsByYear.set(y, []);
    for (const it of cleaned) idsByYear.get(it.y)!.push(it.id);

    return years.map((y) => ({
      ano: String(y),
      jogadores: idsByYear.get(y)?.length ?? 0,
      playerIds: idsByYear.get(y) ?? [],
    })) as any;
  }

  // Caso 2: buckets de 5 anos
  const minY = years[0];
  const maxY = years[years.length - 1];

  const start = Math.floor(minY / 5) * 5;
  const end = Math.ceil(maxY / 5) * 5;

  const buckets: Array<{ label: string; min: number; max: number }> = [];
  for (let s = start; s < end; s += 5) {
    buckets.push({ label: `${s}–${s + 4}`, min: s, max: s + 4 });
  }

  const idsByBucket = new Map<string, string[]>();
  for (const b of buckets) idsByBucket.set(b.label, []);

  for (const it of cleaned) {
    const b = buckets.find((x) => it.y >= x.min && it.y <= x.max);
    if (!b) continue;
    idsByBucket.get(b.label)!.push(it.id);
  }

  return buckets.map((b) => ({
    faixa: b.label,
    jogadores: idsByBucket.get(b.label)?.length ?? 0,
    playerIds: idsByBucket.get(b.label) ?? [],
  })) as any;
};

export async function loadSerranoAgeDistribution(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    // Puxa id + idade + anoNascimento para drilldown por bucket
    const players = await prisma.player.findMany({
      where,
      select: { id: true, idade: true, anoNascimento: true },
    });

    const ageItems = players
      .map((p) => ({ id: String(p.id), idade: toFiniteNumber(p.idade) }))
      .filter((x): x is { id: string; idade: number } => x.idade !== null);

    const birthItems = players
      .map((p) => ({
        id: String(p.id),
        anoNascimento: toFiniteNumber(p.anoNascimento),
      }))
      .filter(
        (x): x is { id: string; anoNascimento: number } =>
          x.anoNascimento !== null,
      );

    const ageData = buildAgeBinsDataWithIds(ageItems);
    const birthData = buildBirthYearDataWithIds(birthItems);

    const hasAge = ageData.some((d: any) => (d.jogadores ?? 0) > 0);
    const hasBirth = birthData.some((d: any) => (d.jogadores ?? 0) > 0);

    if (!hasAge && !hasBirth) {
      return empty(
        "serrano.age_distribution",
        "Nenhum jogador encontrado com os filtros aplicados.",
        "Preencha 'idade' ou 'anoNascimento' nos jogadores (ideal: ambos).",
      );
    }

    const options = [
      ...(hasAge ? [{ id: "age", label: "Idade", data: ageData }] : []),
      ...(hasBirth
        ? [{ id: "birthYear", label: "Ano nasc.", data: birthData }]
        : []),
    ];

    // seu defaultId tinha um bug (invertido). Vou deixar lógico:
    // se tem birthYear, abre nele; senão, age.
    const defaultId = hasBirth ? "birthYear" : "age";

    return ok(
      "serrano.age_distribution",
      { kind: "bar_toggle", options, defaultId },
      filters,
    );
  } catch (err) {
    console.error("loadSerranoAgeDistribution error", err);
    return {
      ok: false,
      widgetId: "serrano.age_distribution",
      error: "Erro ao carregar distribuição de idades.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* serrano.position_distribution (bar + drilldown) */
/* ------------------------------------------------------------------ */

export async function loadSerranoPositionDistribution(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    // 1 query: traz id + posicao (pra montar playerIds por barra)
    const rows = await prisma.player.findMany({
      where,
      select: { id: true, posicao: true },
    });

    const cleaned = rows
      .map((r) => ({
        id: String(r.id),
        key: safeStr(r.posicao, "").trim(),
      }))
      .filter((x) => x.key.length > 0);

    if (!cleaned.length) {
      return empty(
        "serrano.position_distribution",
        "Nenhuma posição encontrada com os filtros aplicados.",
        "Verifique se os jogadores têm o campo 'posicao' preenchido.",
      );
    }

    const idsByPos = groupIdsByKey(cleaned);

    const data: BarDatum[] = Array.from(idsByPos.entries())
      .map(([posicao, playerIds]) => ({
        posicao,
        jogadores: playerIds.length,
        playerIds,
      }))
      .sort((a: any, b: any) => (b.jogadores ?? 0) - (a.jogadores ?? 0)) as any;

    return ok("serrano.position_distribution", { kind: "bar", data }, filters);
  } catch (err) {
    console.error("loadSerranoPositionDistribution error", err);
    return {
      ok: false,
      widgetId: "serrano.position_distribution",
      error: "Erro ao carregar distribuição por posição.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* serrano.market_value_top_players (bar, 1 jogador por barra) */
/* + drilldown: id em cada barra */
/* ------------------------------------------------------------------ */

export async function loadSerranoTopMarketValuePlayers(
  filters?: WidgetFilters,
  topN = 10,
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const players = await prisma.player.findMany({
      where,
      orderBy: { valorMercado: "desc" },
      take: topN,
      select: { id: true, nome: true, valorMercado: true, posicao: true },
    });

    const data: BarDatum[] = players
      .map((p) => {
        const eur = scaleMarketValueMillionsToEur(p.valorMercado);
        if (eur === null) return null;

        return {
          id: String(p.id), // <<< essencial pro click abrir modal
          jogador: safeStr(p.nome, "—"),
          valor: eur,
          posicao: safeStr(p.posicao, ""),
        } as any;
      })
      .filter(Boolean) as any[];

    if (!data.length) {
      return empty(
        "serrano.market_value_top_players",
        "Nenhum jogador com valor de mercado encontrado.",
        "Verifique se 'valorMercado' está preenchido.",
      );
    }

    return ok(
      "serrano.market_value_top_players",
      { kind: "bar", data },
      filters,
    );
  } catch (err) {
    console.error("loadSerranoTopMarketValuePlayers error", err);
    return {
      ok: false,
      widgetId: "serrano.market_value_top_players",
      error: "Erro ao carregar ranking de jogadores.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* serrano.age_vs_value_scatter (scatter + drilldown) */
/* + drilldown: id por ponto */
/* ------------------------------------------------------------------ */

export async function loadSerranoAgeVsValueScatter(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const players = await prisma.player.findMany({
      where,
      select: {
        id: true,
        nome: true,
        idade: true,
        valorMercado: true,
        posicao: true,
      },
      take: 800,
    });

    const data: ScatterDatum[] = players
      .map((p) => {
        const idade = toFiniteNumber(p.idade);
        const valor = scaleMarketValueMillionsToEur(p.valorMercado);
        if (idade === null || valor === null) return null;

        return {
          id: String(p.id), // <<< essencial pro click abrir modal
          idade,
          valor,
          posicao: safeStr(p.posicao, ""),
          nome: safeStr(p.nome, ""), // útil pro título do modal
          label: safeStr(p.nome, ""), // mantém compatível com tooltip atual
        } as any;
      })
      .filter(Boolean) as any;

    if (!data.length) {
      return empty(
        "serrano.age_vs_value_scatter",
        "Dados insuficientes para o gráfico.",
        "Preencha 'idade' e 'valorMercado' em mais jogadores.",
      );
    }

    return ok(
      "serrano.age_vs_value_scatter",
      { kind: "scatter", data },
      filters,
    );
  } catch (err) {
    console.error("loadSerranoAgeVsValueScatter error", err);
    return {
      ok: false,
      widgetId: "serrano.age_vs_value_scatter",
      error: "Erro ao carregar scatter idade vs valor.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* serrano.representation_ranking (bar + drilldown) */
/* + drilldown: playerIds por agência */
/* ------------------------------------------------------------------ */

export async function loadSerranoRepresentationRanking(
  filters?: WidgetFilters,
  topN = 10,
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const SEM_AGENCIA = "Sem agência";

    // 1 query: id + representacao
    const rows = await prisma.player.findMany({
      where,
      select: { id: true, representacao: true },
    });

    const cleaned = rows.map((r) => {
      const rep =
        typeof r.representacao === "string" ? r.representacao.trim() : "";
      return {
        id: String(r.id),
        key: rep.length ? rep : SEM_AGENCIA,
      };
    });

    if (!cleaned.length) {
      return empty(
        "serrano.representation_ranking",
        "Sem dados de agência/representação.",
        "Verifique se existem jogadores cadastrados.",
      );
    }

    const idsByAgency = groupIdsByKey(cleaned);

    // ranking por quantidade
    const ranked = Array.from(idsByAgency.entries())
      .map(([agencia, playerIds]) => ({
        agencia,
        playerIds,
        jogadores: playerIds.length,
      }))
      .sort((a, b) => b.jogadores - a.jogadores);

    // Regra: manter "Sem agência" visível mesmo se não entrar no topN.
    const top = ranked.slice(0, topN);
    const hasSem = top.some((x) => x.agencia === SEM_AGENCIA);
    if (!hasSem) {
      const semEntry = ranked.find((x) => x.agencia === SEM_AGENCIA);
      if (semEntry) {
        top.pop();
        top.push(semEntry);
      }
    }

    const data: BarDatum[] = top.map((x) => ({
      agencia: x.agencia,
      jogadores: x.jogadores,
      playerIds: x.playerIds,
      agenciaShort:
        x.agencia.length > 18 ? x.agencia.slice(0, 18) + "…" : x.agencia,
    })) as any;

    return ok("serrano.representation_ranking", { kind: "bar", data }, filters);
  } catch (err) {
    console.error("loadSerranoRepresentationRanking error", err);
    return {
      ok: false,
      widgetId: "serrano.representation_ranking",
      error: "Erro ao carregar ranking de agências.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* serrano.age_by_position */
/* ------------------------------------------------------------------ */

export async function loadSerranoAgeByPosition(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const players = await prisma.player.findMany({
      where,
      select: { id: true, idade: true, posicao: true },
    });

    const cleaned = players
      .map((p) => ({
        id: String(p.id),
        idade: toFiniteNumber(p.idade),
        posicao: safeStr(p.posicao, ""),
      }))
      .filter(
        (x): x is { id: string; idade: number; posicao: string } =>
          x.idade !== null && x.posicao.length > 0,
      );

    if (!cleaned.length) {
      return empty(
        "serrano.age_by_position",
        "Sem dados suficientes.",
        "Verifique se idade e posição estão preenchidos.",
      );
    }

    const positions = Array.from(new Set(cleaned.map((x) => x.posicao))).sort();

    const options = positions.map((pos) => {
      const playersInPos = cleaned.filter((p) => p.posicao === pos);

      const idsByBin = new Map<string, string[]>();
      for (const b of AGE_BINS) idsByBin.set(b.label, []);

      for (const p of playersInPos) {
        const label = findAgeBinLabel(p.idade);
        if (!label) continue;
        idsByBin.get(label)!.push(p.id);
      }

      const data = AGE_BINS.map((b) => ({
        faixa: b.label,
        jogadores: idsByBin.get(b.label)?.length ?? 0,
        playerIds: idsByBin.get(b.label) ?? [],
      }));

      return {
        id: pos,
        label: pos,
        data,
      };
    });

    return ok(
      "serrano.age_by_position",
      {
        kind: "bar_toggle",
        options,
        defaultId: options[0]?.id,
      },
      filters,
    );
  } catch (err) {
    console.error("loadSerranoAgeByPosition error", err);
    return {
      ok: false,
      widgetId: "serrano.age_by_position",
      error: "Erro ao carregar idade por posição.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* serrano.rights_distribution */
/* ------------------------------------------------------------------ */

const RIGHTS_BUCKETS = [
  { label: "0–10%", min: 0, max: 10 },
  { label: "10–20%", min: 10, max: 20 },
  { label: "20–30%", min: 20, max: 30 },
  { label: "30–40%", min: 30, max: 40 },
  { label: "40–50%", min: 40, max: 50 },
  { label: "50–60%", min: 50, max: 60 },
  { label: "60–70%", min: 60, max: 70 },
  { label: "70–80%", min: 70, max: 80 },
  { label: "80–90%", min: 80, max: 90 },
  { label: "90–100%", min: 90, max: 100 },
] as const;

export async function loadSerranoRightsDistribution(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  try {
    const where = buildBaseWhere(filters);

    const players = await prisma.player.findMany({
      where,
      select: { id: true, possePct: true },
    });

    const cleaned = players
      .map((p) => ({
        id: String(p.id),
        rights: toFiniteNumber(p.possePct),
      }))
      .filter((x): x is { id: string; rights: number } => x.rights !== null);

    if (!cleaned.length) {
      return empty(
        "serrano.rights_distribution",
        "Nenhum jogador com direitos cadastrados.",
        "Preencha o campo 'direitosSerrano'.",
      );
    }

    const idsByBucket = new Map<string, string[]>();
    for (const b of RIGHTS_BUCKETS) idsByBucket.set(b.label, []);

    for (const p of cleaned) {
      const bucket = RIGHTS_BUCKETS.find(
        (b) => p.rights >= b.min && p.rights < b.max,
      );
      if (!bucket) continue;
      idsByBucket.get(bucket.label)!.push(p.id);
    }

    const data = RIGHTS_BUCKETS.map((b) => ({
      faixa: b.label,
      jogadores: idsByBucket.get(b.label)?.length ?? 0,
      playerIds: idsByBucket.get(b.label) ?? [],
    }));

    return ok(
      "serrano.rights_distribution",
      { kind: "bar", data },
      filters,
    );
  } catch (err) {
    console.error("loadSerranoRightsDistribution error", err);
    return {
      ok: false,
      widgetId: "serrano.rights_distribution",
      error: "Erro ao carregar distribuição de direitos.",
    };
  }
}


/* ------------------------------------------------------------------ */
/* Dispatcher */
/* ------------------------------------------------------------------ */

export async function loadSerranoWidget(
  widgetId: string,
  filters?: WidgetFilters,
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
    case "serrano.rights_distribution":
      return loadSerranoRightsDistribution(filters);

    case "serrano.age_by_position":
      return loadSerranoAgeByPosition(filters);

    default:
      return empty(widgetId, "Widget do Serrano ainda não implementado.");
  }
}
