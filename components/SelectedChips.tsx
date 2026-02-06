"use client";

import { WidgetDefinition, WidgetId } from "@/type/dashboard";

type Props = {
  selected: WidgetId[];
  widgets: WidgetDefinition[];
  onRemove: (id: WidgetId) => void;
};

/**
 * Chips dos widgets selecionados
 * - feedback visual imediato
 * - remoção rápida
 * - evita "liguei mas não sei onde está"
 */
export function SelectedChips({ selected, widgets, onRemove }: Props) {
  if (!selected.length) return null;

  const map = new Map(widgets.map((w) => [w.id, w]));

  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <div className="mb-2 text-xs font-medium text-slate-500">
        Selecionados ({selected.length})
      </div>

      <div className="flex flex-wrap gap-2">
        {selected.map((id) => {
          const w = map.get(id);
          if (!w) return null;

          return (
            <span
              key={id}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
            >
              {w.title}
              <button
                onClick={() => onRemove(id)}
                className="text-slate-500 hover:text-slate-900"
                aria-label={`Remover ${w.title}`}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
