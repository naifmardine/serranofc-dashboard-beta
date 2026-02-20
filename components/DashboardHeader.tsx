"use client";

import { LayoutGrid } from "lucide-react";
import PageTitle from "@/components/Atoms/PageTitle";
import type { DashboardView } from "@/type/dashboard";
import ExportPrintButton from "@/components/ExportPrintButton";

const SERRANO_BLUE = "#003399";

type Props = {
  view: DashboardView;
  onViewChange: (v: DashboardView) => void;
  onOpenPicker: () => void;

  onExport: () => void;
  exporting?: boolean;
  exportDisabled?: boolean;
  exportError?: string | null;
};

const TABS: Array<{ id: DashboardView; label: string }> = [
  { id: "serrano", label: "Serrano" },
  { id: "market", label: "Mercado" },
  { id: "both", label: "Ambos" },
  { id: "compare", label: "Comparativo" },
];

export function DashboardHeader({
  view,
  onViewChange,
  onOpenPicker,
  onExport,
  exporting,
  exportDisabled,
  exportError,
}: Props) {
  const disabled = !!exporting || !!exportDisabled;

  const actions = (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* LEFT: Export */}
        <div className="shrink-0">
          <ExportPrintButton
            onClick={onExport}
            loading={!!exporting}
            disabled={disabled}
          />
        </div>

        {/* RIGHT: Tabs + Widgets */}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1">
            {TABS.map((t) => {
              const active = t.id === view;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onViewChange(t.id)}
                  className={[
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer",
                    active ? "text-white" : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                  style={active ? { backgroundColor: SERRANO_BLUE } : undefined}
                  aria-pressed={active}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenPicker}
            className="inline-flex items-center cursor-pointer gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            title="Escolher widgets"
            data-no-export="true"
          >
            <LayoutGrid size={18} />
            Widgets
          </button>
        </div>
      </div>

      {exportError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          Falha ao exportar: {exportError}
        </div>
      ) : null}
    </div>
  );

  return <PageTitle base="Principal" title="Dashboard" actions={actions} />;
}