"use client";

import { WidgetCard } from "./WidgetCard";
import type {
  DashboardLayout,
  WidgetDefinition,
  WidgetId,
  WidgetSize,
} from "@/type/dashboard";

type WidgetState = {
  loading: boolean;
  data?: any;
};

type Props = {
  widgets: WidgetDefinition[];
  widgetsState: Partial<Record<WidgetId, WidgetState>>;

  // pode vir undefined em algum render (ex: init / hot reload / prop não passado)
  layout?: DashboardLayout;
  onChangeLayout: (next: DashboardLayout) => void;
};

/**
 * Grid responsável APENAS por layout:
 * - calcula size efetivo (layout.sizes > defaultSize)
 * - aplica colSpan em lg (12 col)
 * - garante min-w-0 (Recharts precisa)
 */
export function DashboardGrid({
  widgets,
  widgetsState,
  layout,
  onChangeLayout,
}: Props) {
  // evita crash "Cannot read properties of undefined (reading 'sizes')"
  const sizes = layout?.sizes ?? {};
  const fallbackLayout =
    layout ??
    ({
      version: 1,
      scope: "both",
      enabled: [],
      order: [],
      sizes: {},
    } as any as DashboardLayout);

  const setWidgetSize = (id: WidgetId, size: WidgetSize) => {
    const next: DashboardLayout = {
      ...fallbackLayout,
      sizes: {
        ...(fallbackLayout.sizes ?? {}),
        [id]: size,
      },
    };

    onChangeLayout(next);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
      {widgets.map((widget) => {
        const state = widgetsState[widget.id];
        const effectiveSize = (sizes[widget.id] ??
          widget.defaultSize) as WidgetSize;

        return (
          <div
            key={widget.id}
            className={[
              "col-span-1",
              "sm:col-span-2",
              lgColSpanClass(effectiveSize),
              "min-w-0", // ✅ Recharts: evita width = -1 em flex/grid
            ].join(" ")}
          >
            <WidgetCard
              widget={widget}
              loading={state?.loading ?? true}
              data={state?.data}
              size={effectiveSize}
              onSizeChange={(s) => setWidgetSize(widget.id, s)}
            />
          </div>
        );
      })}
    </div>
  );
}

// Tailwind-safe: classes fixas
function lgColSpanClass(size: WidgetSize) {
  switch (size) {
    case "sm":
      return "lg:col-span-4";
    case "md":
      return "lg:col-span-6";
    case "lg":
      return "lg:col-span-12";
    default:
      return "lg:col-span-6";
  }
}
