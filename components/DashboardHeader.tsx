"use client";

import { LayoutGrid } from "lucide-react";
import PageTitle from "@/components/Atoms/PageTitle";
import type { DashboardView } from "@/type/dashboard";
import ExportPrintButton from "@/components/ExportPrintButton";
import { useI18n } from "@/contexts/I18nContext";

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

const TAB_KEYS: Array<{ id: DashboardView; key: "serrano" | "mercado" | "ambos" | "comparativo" }> = [
  { id: "serrano", key: "serrano" },
  { id: "market", key: "mercado" },
  { id: "both", key: "ambos" },
  { id: "compare", key: "comparativo" },
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
  const { t } = useI18n();
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
            {TAB_KEYS.map((tab) => {
              const active = tab.id === view;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onViewChange(tab.id)}
                  className={[
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer",
                    active ? "text-white" : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                  style={active ? { backgroundColor: SERRANO_BLUE } : undefined}
                  aria-pressed={active}
                >
                  {(t.dashboard as any)[tab.key]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenPicker}
            className="inline-flex items-center cursor-pointer gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            title={t.dashboard_escolherWidgets}
            data-no-export="true"
          >
            <LayoutGrid size={18} />
            {t.dashboard.widgets}
          </button>
        </div>
      </div>

      {exportError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {t.dashboard.falhaExportar}: {exportError}
        </div>
      ) : null}
    </div>
  );

  return <PageTitle base={t.common.principal} title={t.dashboard.title} actions={actions} />;
}