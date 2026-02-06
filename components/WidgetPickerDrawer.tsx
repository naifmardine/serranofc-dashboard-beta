"use client";

import { useMemo, useState } from "react";
import {
  DashboardLayout,
  WidgetDefinition,
  WidgetGroup,
  WidgetId,
} from "@/type/dashboard";
import { SelectedChips } from "@/components/SelectedChips";

type Props = {
  open: boolean;
  onClose: () => void;
  layout: DashboardLayout;
  widgets: WidgetDefinition[];
  onChange: (layout: DashboardLayout) => void;
};

/**
 * Drawer de personalização do dashboard
 * - Seleção por GRUPO (chips)
 * - Busca por texto
 * - Toggle de widgets (sem checklist infinito)
 * - Chips dos selecionados
 *
 * MVP:
 * - sem drag
 * - ordem preservada conforme layout.order
 */
export function WidgetPickerDrawer({
  open,
  onClose,
  layout,
  widgets,
  onChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<WidgetGroup | "all">("all");

  const enabledSet = useMemo(() => new Set(layout.enabled), [layout.enabled]);

  const filteredWidgets = useMemo(() => {
    return widgets.filter((w) => {
      if (group !== "all" && w.group !== group) return false;
      if (!query) return true;

      const q = query.toLowerCase();
      return (
        w.title.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q) ||
        w.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [widgets, group, query]);

  const toggleWidget = (id: WidgetId) => {
    const nextEnabled = enabledSet.has(id)
      ? layout.enabled.filter((w) => w !== id)
      : [...layout.enabled, id];

    const nextOrder = enabledSet.has(id)
      ? layout.order.filter((w) => w !== id)
      : [...layout.order, id];

    onChange({
      ...layout,
      enabled: nextEnabled,
      order: nextOrder,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Editar dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Escolha quais gráficos aparecem na tela
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar gráficos..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Groups */}
        <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-slate-100">
          <GroupChip active={group === "all"} onClick={() => setGroup("all")}>
            Todos
          </GroupChip>
          {GROUPS.map((g) => (
            <GroupChip key={g} active={group === g} onClick={() => setGroup(g)}>
              {labelForGroup(g)}
            </GroupChip>
          ))}
        </div>

        {/* Selected */}
        <SelectedChips
          selected={layout.enabled}
          widgets={widgets}
          onRemove={toggleWidget}
        />

        {/* List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {filteredWidgets.map((w) => {
            const enabled = enabledSet.has(w.id);

            return (
              <div
                key={w.id}
                className={[
                  "flex items-start justify-between gap-3 rounded-lg border p-3 transition",
                  enabled
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {w.title}
                  </div>
                  {w.description && (
                    <div className="text-xs text-slate-500">
                      {w.description}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleWidget(w.id)}
                  className={[
                    "rounded-md px-3 py-1 text-xs font-medium transition",
                    enabled
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {enabled ? "Ativo" : "Adicionar"}
                </button>
              </div>
            );
          })}

          {filteredWidgets.length === 0 && (
            <div className="text-sm text-slate-500">
              Nenhum gráfico encontrado.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Auxiliares */
/* ------------------------------------------------------------------ */

const GROUPS: WidgetGroup[] = [
  "overview",
  "serrano",
  "market",
  "compare",
  "finance",
  "performance",
];

function labelForGroup(group: WidgetGroup) {
  switch (group) {
    case "overview":
      return "Visão geral";
    case "serrano":
      return "Serrano";
    case "market":
      return "Mercado";
    case "compare":
      return "Comparativos";
    case "finance":
      return "Financeiro";
    case "performance":
      return "Performance";
    default:
      return group;
  }
}

function GroupChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs transition",
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
