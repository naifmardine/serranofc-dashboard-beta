import { WidgetGroup } from "@/type/dashboard";

/**
 * Definição central dos grupos de widgets
 * - Usado pelo picker
 * - Usado para labels consistentes
 * - Evita string solta espalhada no código
 */

export const WIDGET_GROUPS: WidgetGroup[] = [
  "overview",
  "serrano",
  "market",
  "compare",
  "finance",
  "performance",
];

export const WIDGET_GROUP_LABEL: Record<WidgetGroup, string> = {
  overview: "Visão geral",
  serrano: "Serrano",
  market: "Mercado",
  compare: "Comparativos",
  finance: "Financeiro",
  performance: "Performance",
};

/**
 * Ordem sugerida (UX)
 * - usada para render inicial no picker
 * - não afeta layout do grid
 */
export const WIDGET_GROUP_ORDER: WidgetGroup[] = [
  "overview",
  "serrano",
  "market",
  "compare",
  "finance",
  "performance",
];

/**
 * Ajuda a decidir se um grupo deve aparecer
 * com base no scope atual (Serrano / Mercado / Ambos)
 */
export function groupAllowedByScope(
  group: WidgetGroup,
  scope: "serrano" | "market" | "both"
) {
  if (scope === "both") return true;

  if (scope === "serrano") {
    return (
      group === "overview" ||
      group === "serrano" ||
      group === "compare" ||
      group === "finance" ||
      group === "performance"
    );
  }

  if (scope === "market") {
    return (
      group === "overview" ||
      group === "market" ||
      group === "compare" ||
      group === "finance"
    );
  }

  return true;
}
