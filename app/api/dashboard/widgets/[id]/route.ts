import { NextRequest, NextResponse } from "next/server";

import { loadSerranoWidget } from "@/lib/dashboard/loaders/serrano";
import { loadMarketWidget } from "@/lib/dashboard/loaders/market";
import { loadOverviewWidget } from "@/lib/dashboard/loaders/overview";

import type {
  WidgetApiResponse,
  WidgetFilters,
  WidgetId,
  WidgetScope,
  PeriodFilter,
} from "@/type/dashboard";

/* -----------------------------
 * Query parsing
 * ----------------------------- */
function parseList(sp: URLSearchParams, key: string): string[] | undefined {
  const raw = sp.get(key);
  if (!raw) return undefined;

  const arr = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return arr.length ? arr : undefined;
}

function readPeriod(sp: URLSearchParams): PeriodFilter | undefined {
  const from =
    sp.get("from") ?? sp.get("periodFrom") ?? sp.get("period.from") ?? undefined;

  const to =
    sp.get("to") ?? sp.get("periodTo") ?? sp.get("period.to") ?? undefined;

  const out: PeriodFilter = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) out.from = from;
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) out.to = to;

  return out.from || out.to ? out : undefined;
}

function readFilters(req: NextRequest): WidgetFilters | undefined {
  const sp = req.nextUrl.searchParams;

  const period = readPeriod(sp);

  // shared / serrano
  const position = parseList(sp, "position");
  const agency = parseList(sp, "agency");
  const situation = parseList(sp, "situation");
  const foot = parseList(sp, "foot");

  // market
  const club = parseList(sp, "club");
  const country = parseList(sp, "country");
  const league = parseList(sp, "league");

  const hasAny =
    !!period ||
    !!position?.length ||
    !!agency?.length ||
    !!situation?.length ||
    !!foot?.length ||
    !!club?.length ||
    !!country?.length ||
    !!league?.length;

  if (!hasAny) return undefined;

  return {
    ...(period ? { period } : {}),
    ...(position ? { position } : {}),
    ...(agency ? { agency } : {}),
    ...(situation ? { situation } : {}),
    ...(foot ? { foot } : {}),
    ...(club ? { club } : {}),
    ...(country ? { country } : {}),
    ...(league ? { league } : {}),
  };
}

/* -----------------------------
 * Helpers
 * ----------------------------- */
function empty(widgetId: string, reason: string, hint?: string): WidgetApiResponse {
  return {
    ok: true,
    widgetId: widgetId as WidgetId,
    generatedAt: new Date().toISOString(),
    payload: { kind: "empty", reason, ...(hint ? { hint } : {}) },
  };
}

function getOrigin(req: NextRequest) {
  return req.nextUrl.origin;
}

/* -----------------------------
 * Route
 * ----------------------------- */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  let widgetIdStr = "unknown";

  try {
    // Next pode entregar params como Promise
    const unwrapped = await params;
    const id = unwrapped?.id;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        empty("unknown", "Parâmetro de widget ausente/ inválido.", "params.id veio vazio"),
        { status: 200 }
      );
    }

    widgetIdStr = id;
    const widgetId = id as WidgetId;

    const scope = (req.nextUrl.searchParams.get("scope") ?? "both") as WidgetScope;
    const filters = readFilters(req);
    const origin = getOrigin(req);

    // -------------------------
    // OVERVIEW
    // -------------------------
    if (widgetId.startsWith("overview.")) {
      const res = await loadOverviewWidget(widgetId, filters, scope, origin);
      return NextResponse.json(res, { status: 200 });
    }

    // -------------------------
    // SERRANO (inclui kpi.serrano.*)
    // -------------------------
    if (widgetId.startsWith("serrano.") || widgetId.startsWith("kpi.serrano.")) {
      const res = await loadSerranoWidget(widgetId, filters);
      return NextResponse.json(res, { status: 200 });
    }

    // -------------------------
    // MARKET (inclui kpi.market.*)
    // -------------------------
    if (widgetId.startsWith("market.") || widgetId.startsWith("kpi.market.")) {
      if (scope === "serrano") {
        return NextResponse.json(
          empty(widgetId, "Widget não aplicável ao escopo Serrano."),
          { status: 200 }
        );
      }

      const res = await loadMarketWidget(widgetId, filters);
      return NextResponse.json(res, { status: 200 });
    }

    // -------------------------
    // COMPARE (MVP desligado)
    // -------------------------
    if (widgetId.startsWith("compare.")) {
      return NextResponse.json(
        empty(widgetId, "Widgets comparativos ainda não habilitados."),
        { status: 200 }
      );
    }

    // -------------------------
    // FALLBACK
    // -------------------------
    return NextResponse.json(empty(widgetId, "Widget não reconhecido."), {
      status: 200,
    });
  } catch (err: any) {
    console.error("Dashboard widget route error", err);
    return NextResponse.json(
      empty(widgetIdStr, "Erro interno ao carregar widget.", err?.message),
      { status: 200 }
    );
  }
}
