"use client";

import { WidgetScope } from "@/type/dashboard";

type Props = {
  scope: WidgetScope;
  onScopeChange: (scope: WidgetScope) => void;
  onOpenPicker: () => void;
};

export function DashboardHeader({ scope, onScopeChange, onOpenPicker }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Title */}
      <div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <span className="text-xs text-slate-500">Visão geral</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <ScopeToggle value={scope} onChange={onScopeChange} />

        <button
          onClick={onOpenPicker}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
        >
          Editar dashboard
        </button>
      </div>
    </div>
  );
}

function ScopeToggle({
  value,
  onChange,
}: {
  value: WidgetScope;
  onChange: (v: WidgetScope) => void;
}) {
  const options: { value: WidgetScope; label: string }[] = [
    { value: "serrano", label: "Serrano" },
    { value: "both", label: "Ambos" },
    { value: "market", label: "Mercado" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              "rounded-md px-3 py-1.5 text-sm transition",
              active
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
