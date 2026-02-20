import type { DashboardLayout, WidgetId, WidgetScope, DashboardView } from "@/type/dashboard";
import { WIDGETS } from "./widgetDefinitions";

const STORAGE_KEY = "serrano.dashboard.layout.v2";
const VERSION = 2;

/**
 * Presets:
 * - "serrano": mostra tudo do grupo serrano (e também qualquer overview que seja scope serrano)
 * - "market": mostra tudo do grupo market
 * - "both": mostra tudo (serrano + market + compare + overview)
 * - "compare": mostra tudo do grupo compare
 *
 * OBS:
 * - KPIs não entram aqui porque o grid exclui "kpi.*"
 */
function presetWidgetIds(view: DashboardView): WidgetId[] {
  const all = WIDGETS.map((w) => w).filter((w) => !w.id.startsWith("kpi."));
  const ids = (arr: typeof all) => arr.map((w) => w.id);

  if (view === "both") return ids(all);

  if (view === "compare") {
    return ids(all.filter((w) => w.group === "compare"));
  }

  if (view === "serrano") {
    // Serrano: tudo do grupo "serrano"
    // + overview que seja "serrano" (ex: geo_map se você mudar scope dele pra serrano)
    return ids(
      all.filter((w) => w.group === "serrano" || (w.group === "overview" && w.scope === "serrano")),
    );
  }

  // market
  return ids(all.filter((w) => w.group === "market"));
}

export function viewToDataScope(view: DashboardView): WidgetScope {
  if (view === "compare") return "both";
  return view; // serrano | market | both
}

/**
 * Defaults bons (MVP)
 * - por padrão: "both" usando defaultEnabled (igual você tinha)
 */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = (() => {
  const defaults = WIDGETS.filter((w) => w.defaultEnabled).map((w) => w.id);

  return {
    version: VERSION,
    view: "both",
    enabled: defaults,
    order: defaults,
    sizes: {},
  };
})();

/**
 * Valida ids existentes e consistência enabled/order.
 */
function sanitizeLayout(layout: DashboardLayout): DashboardLayout {
  const validIds = new Set<WidgetId>(WIDGETS.map((w) => w.id));

  const enabled = (layout.enabled ?? []).filter((id) => validIds.has(id));
  const order = (layout.order ?? []).filter((id) => validIds.has(id));

  const missingInOrder = enabled.filter((id) => !order.includes(id));
  const nextOrder = [...order, ...missingInOrder];

  const nextView: DashboardView =
    layout.view === "serrano" ||
    layout.view === "market" ||
    layout.view === "both" ||
    layout.view === "compare"
      ? layout.view
      : "both";

  return {
    version: VERSION,
    view: nextView,
    enabled,
    order: nextOrder,
    sizes: layout.sizes ?? {},
  };
}

/**
 * Cria um layout preset limpo (enabled/order = ids do preset)
 * sizes mantém (você pode optar por resetar sizes, mas preservei).
 */
export function buildPresetLayout(view: DashboardView, prev?: DashboardLayout): DashboardLayout {
  const ids = presetWidgetIds(view);
  return sanitizeLayout({
    version: VERSION,
    view,
    enabled: ids,
    order: ids,
    sizes: prev?.sizes ?? {},
  });
}

export function loadLayoutFromStorage(): DashboardLayout {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_LAYOUT;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DASHBOARD_LAYOUT;

    const parsed = JSON.parse(raw) as DashboardLayout;

    if (!parsed || parsed.version !== VERSION) {
      return DEFAULT_DASHBOARD_LAYOUT;
    }

    return sanitizeLayout(parsed);
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

export function saveLayoutToStorage(layout: DashboardLayout) {
  if (typeof window === "undefined") return;

  try {
    const next = sanitizeLayout(layout);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // noop
  }
}

export function resetLayoutToDefault() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
}
