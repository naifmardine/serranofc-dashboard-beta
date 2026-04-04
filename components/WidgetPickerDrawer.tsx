"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import type {
  DashboardLayout,
  WidgetDefinition,
  WidgetGroup,
  WidgetId,
} from "@/type/dashboard";
import { SelectedChips } from "@/components/SelectedChips";
import {
  SlidersHorizontal,
  CheckCircle2,
  Layers,
  Trash2,
  ChevronDown,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  layout: DashboardLayout;
  widgets: WidgetDefinition[];
  onChange: (layout: DashboardLayout) => void;
};

const SERRANO_BLUE = "#003399";
const SERRANO_YELLOW = "#F2CD00";

export function WidgetPickerDrawer({
  open,
  onClose,
  layout,
  widgets,
  onChange,
}: Props) {
  const { t } = useI18n();
  const [group, setGroup] = useState<WidgetGroup | "all">("all");
  const [showActive, setShowActive] = useState(true);

  const enabledSet = useMemo(() => new Set(layout.enabled), [layout.enabled]);

  const groupsWithCount = useMemo(() => {
    const counts: Record<string, { total: number; enabled: number }> = {};
    for (const w of widgets) {
      const g = w.group;
      if (!counts[g]) counts[g] = { total: 0, enabled: 0 };
      counts[g].total += 1;
      if (enabledSet.has(w.id)) counts[g].enabled += 1;
    }
    return {
      all: { total: widgets.length, enabled: layout.enabled.length },
      byGroup: counts,
    };
  }, [widgets, enabledSet, layout.enabled.length]);

  const filteredWidgets = useMemo(() => {
    return widgets.filter((w) => (group === "all" ? true : w.group === group));
  }, [widgets, group]);

  const toggleWidget = (id: WidgetId) => {
    const isEnabled = enabledSet.has(id);

    const nextEnabled = isEnabled
      ? layout.enabled.filter((w) => w !== id)
      : [...layout.enabled, id];

    const nextOrder = isEnabled
      ? layout.order.filter((w) => w !== id)
      : layout.order.includes(id)
        ? layout.order
        : [...layout.order, id];

    onChange({
      ...layout,
      enabled: nextEnabled,
      order: nextOrder,
    });
  };

  function clearAll() {
    onChange({
      ...layout,
      enabled: [],
      order: [],
    });
  }

  function getGroupLabel(g: WidgetGroup) {
    switch (g) {
      case "serrano":
        return t.widgetPicker.serrano;
      case "market":
        return t.widgetPicker.mercado;
      case "compare":
        return t.widgetPicker.comparativos;
      default:
        return g;
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <button
        type="button"
        aria-label={t.widgetPicker.fechar}
        className="flex-1 bg-black/35 cursor-pointer"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-full max-w-[680px] bg-white shadow-2xl flex flex-col">
        {/* Header (fixo) */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl border"
                  style={{
                    backgroundColor: `${SERRANO_BLUE}10`,
                    borderColor: `${SERRANO_BLUE}20`,
                  }}
                >
                  <SlidersHorizontal
                    className="h-4 w-4"
                    style={{ color: SERRANO_BLUE }}
                  />
                </span>

                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900">
                    {t.widgetPicker.personalizar}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t.widgetPicker.descricao}
                  </div>
                </div>
              </div>

              {/* Resumo */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {layout.enabled.length} {layout.enabled.length === 1 ? t.widgetPicker.ativo : t.widgetPicker.ativos}
                </span>

                <span className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  <Layers className="h-3.5 w-3.5" />
                  {widgets.length} {widgets.length === 1 ? t.widgetPicker.disponivel : t.widgetPicker.disponiveis}
                </span>

                {/* botão com cara de botão */}
                <button
                  type="button"
                  onClick={() => setShowActive((s) => !s)}
                  className={[
                    "inline-flex items-center justify-center gap-2",
                    "rounded-xl px-3 py-1.5 text-xs font-extrabold",
                    "border shadow-sm transition cursor-pointer",
                    "hover:opacity-90 active:scale-[0.99]",
                    "text-white",
                  ].join(" ")}
                  style={{
                    backgroundColor: SERRANO_BLUE,
                    borderColor: `${SERRANO_BLUE}40`,
                  }}
                  title={t.widgetPicker.verAtivos}
                >
                  {showActive ? t.widgetPicker.ocultarAtivos : t.widgetPicker.verAtivos}
                  <ChevronDown
                    className={[
                      "h-3.5 w-3.5 transition-transform",
                      showActive ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={clearAll}
                disabled={layout.enabled.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                title={t.widgetPicker.limpar}
              >
                <Trash2 className="h-4 w-4" />
                {t.widgetPicker.limpar}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold text-black cursor-pointer hover:brightness-95"
                style={{ backgroundColor: SERRANO_YELLOW }}
                title={t.widgetPicker.fechar}
              >
                {t.widgetPicker.fechar}
              </button>
            </div>
          </div>

          {/* Ativos (colapsável, enxuto) */}
          {showActive && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t.widgetPicker.ativos}
                </div>
                <div className="text-xs text-slate-500">
                  {t.widgetPicker.cliqueRemover}
                </div>
              </div>

              <SelectedChips
                selected={layout.enabled}
                widgets={widgets}
                onRemove={toggleWidget}
              />

              {layout.enabled.length === 0 && (
                <div className="mt-2 text-sm text-slate-500">
                  {t.widgetPicker.nenhumAtivo}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content (scroll único do drawer) */}
        <div className="flex-1 overflow-auto">
          {/* Groups (centralizado) */}
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="inline-flex w-full flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
              <GroupTab
                active={group === "all"}
                onClick={() => setGroup("all")}
                label={t.widgetPicker.todos}
                meta={`${groupsWithCount.all.enabled}/${groupsWithCount.all.total}`}
              />

              {GROUPS.map((g) => {
                const c = groupsWithCount.byGroup[g] ?? {
                  enabled: 0,
                  total: 0,
                };
                return (
                  <GroupTab
                    key={g}
                    active={group === g}
                    onClick={() => setGroup(g)}
                    label={getGroupLabel(g)}
                    meta={`${c.enabled}/${c.total}`}
                  />
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t.widgetPicker.widgets}
              </div>
              <div className="text-xs text-slate-500">
                {filteredWidgets.length} {filteredWidgets.length === 1 ? t.widgetPicker.resultado : t.widgetPicker.resultados}
              </div>
            </div>

            <div className="space-y-2">
              {filteredWidgets.map((w) => {
                const enabled = enabledSet.has(w.id);

                return (
                  <div
                    key={w.id}
                    className={[
                      "group flex items-start justify-between gap-3 rounded-2xl border p-3 transition",
                      enabled
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {w.title}
                      </div>

                      {w.description ? (
                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {w.description}
                        </div>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {getGroupLabel(w.group)}
                        </span>

                        {enabled ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold"
                            style={{
                              backgroundColor: `${SERRANO_BLUE}10`,
                              color: SERRANO_BLUE,
                              border: `1px solid ${SERRANO_BLUE}20`,
                            }}
                          >
                            {t.widgetPicker.ativoLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            {t.widgetPicker.inativoLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA com cores Serrano */}
                    <button
                      type="button"
                      onClick={() => toggleWidget(w.id)}
                      className={[
                        "shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold transition cursor-pointer",
                        enabled
                          ? "text-white hover:opacity-95"
                          : "text-black hover:brightness-95",
                      ].join(" ")}
                      style={
                        enabled
                          ? { backgroundColor: SERRANO_BLUE }
                          : { backgroundColor: SERRANO_YELLOW }
                      }
                      title={
                        enabled
                          ? t.widgetPicker.removerDashboard
                          : t.widgetPicker.adicionarDashboard
                      }
                    >
                      {enabled ? t.widgetPicker.remover : t.widgetPicker.adicionar}
                    </button>
                  </div>
                );
              })}

              {filteredWidgets.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {t.widgetPicker.nenhumWidget}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Auxiliares */
/* ------------------------------------------------------------------ */

const GROUPS: WidgetGroup[] = ["serrano", "market", "compare"];

function GroupTab({
  active,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer",
        active ? "text-white" : "text-slate-700 hover:bg-slate-50",
      ].join(" ")}
      style={active ? { backgroundColor: SERRANO_BLUE } : undefined}
      title={label}
    >
      <span className="truncate">{label}</span>
      <span
        className={[
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold",
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700",
        ].join(" ")}
      >
        {meta}
      </span>
    </button>
  );
}
