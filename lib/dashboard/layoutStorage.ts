import { DashboardLayout, WidgetId, WidgetScope } from "@/type/dashboard";
import { WIDGETS } from "./widgetDefinitions";

const STORAGE_KEY = "serrano.dashboard.layout.v1";
const VERSION = 1;

/**
 * Defaults bons (MVP)
 * - poucos widgets, alto sinal
 * - ordem já otimizada pra grid
 */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = (() => {
  const defaults = WIDGETS.filter((w) => w.defaultEnabled).map((w) => w.id);

  // ordem inicial: defaults primeiro, depois o resto (se você habilitar no futuro)
  return {
    version: VERSION,
    scope: "both",
    enabled: defaults,
    order: defaults,
    sizes: {},
  };
})();

/**
 * Valida se os ids existem (evita quebrar quando você renomeia widgets).
 */
function sanitizeLayout(layout: DashboardLayout): DashboardLayout {
  const validIds = new Set<WidgetId>(WIDGETS.map((w) => w.id));

  const enabled = layout.enabled.filter((id) => validIds.has(id));
  const order = layout.order.filter((id) => validIds.has(id));

  // garante que todo enabled está em order
  const missingInOrder = enabled.filter((id) => !order.includes(id));
  const nextOrder = [...order, ...missingInOrder];

  // scope fallback
  const nextScope: WidgetScope =
    layout.scope === "serrano" || layout.scope === "market" || layout.scope === "both"
      ? layout.scope
      : "both";

  return {
    version: VERSION,
    scope: nextScope,
    enabled,
    order: nextOrder,
    sizes: layout.sizes ?? {},
  };
}

export function loadLayoutFromStorage(): DashboardLayout | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DashboardLayout;

    // versão diferente: reseta pro default (simples no MVP)
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
  }
}

export function resetLayoutToDefault() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(DEFAULT_DASHBOARD_LAYOUT)
  );
}
