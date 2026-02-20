"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardGrid } from "./DashboardGrid";
import { WidgetPickerDrawer } from "./WidgetPickerDrawer";
import { KpiRow } from "./KpiRow";

import { WIDGETS } from "@/lib/dashboard/widgetDefinitions";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  buildPresetLayout,
  loadLayoutFromStorage,
  saveLayoutToStorage,
  viewToDataScope,
} from "@/lib/dashboard/layoutStorage";

import type {
  DashboardLayout,
  DashboardView,
  KpisApiResponse,
  WidgetApiResponse,
  WidgetDefinition,
  WidgetId,
  WidgetScope,
} from "@/type/dashboard";

import { PlayersDrilldownProvider } from "@/components/PlayersDrilldownProvider";
import { useDashboardPdfExport } from "@/hooks/useDashboardPdfExport";

type WidgetState = {
  loading: boolean;
  data?: WidgetApiResponse;
};

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

export function DashboardClient() {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [kpis, setKpis] = useState<KpisApiResponse | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  const [widgetsState, setWidgetsState] = useState<
    Partial<Record<WidgetId, WidgetState>>
  >({});

  const reqSeq = useRef(0);

  // EXPORT (html-to-image + jsPDF)
  const { exportRef, exportPdf, exporting, error: exportError } =
    useDashboardPdfExport();

  // ---------- init layout ----------
  useEffect(() => {
    const stored = loadLayoutFromStorage();
    if (stored) setLayout(stored);
  }, []);

  // ---------- persist layout ----------
  useEffect(() => {
    saveLayoutToStorage(layout);
  }, [layout]);

  // ---------- data scope derivado do preset ----------
  const dataScope: WidgetScope = useMemo(() => viewToDataScope(layout.view), [layout.view]);

  // ---------- catalog (SEM KPIs) ----------
  const widgetsCatalog: WidgetDefinition[] = useMemo(() => {
    return WIDGETS.filter((w) => !w.id.startsWith("kpi."));
  }, []);

  // ---------- enabled + ordered ----------
  const enabledWidgets = useMemo(() => {
    const enabledSet = new Set(layout.enabled);
    const orderedEnabledIds = uniq(layout.order).filter((id) => enabledSet.has(id));

    const map = new Map(widgetsCatalog.map((w) => [w.id, w]));
    return orderedEnabledIds
      .map((id) => map.get(id))
      .filter(Boolean) as WidgetDefinition[];
  }, [layout.enabled, layout.order, widgetsCatalog]);

  const enabledIds = useMemo(() => enabledWidgets.map((w) => w.id), [enabledWidgets]);
  const enabledIdsKey = useMemo(() => enabledIds.join("|"), [enabledIds]);

  // ---------- load KPIs ----------
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    const run = async (scope: WidgetScope) => {
      setKpisLoading(true);

      try {
        const res = await fetch(`/api/dashboard/kpis?scope=${scope}`, {
          cache: "no-store",
          signal: ctrl.signal,
        });

        const json = (await res.json()) as KpisApiResponse;
        if (!cancelled) setKpis(json);
      } catch (err: any) {
        if (ctrl.signal.aborted) return;
        if (!cancelled) setKpis({ ok: false, error: "Erro ao carregar KPIs." } as any);
      } finally {
        if (!cancelled) setKpisLoading(false);
      }
    };

    run(dataScope);

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [dataScope]);

  // ---------- quando preset muda: limpa state fora do enabled ----------
  useEffect(() => {
    setWidgetsState((prev) => {
      const next: Partial<Record<WidgetId, WidgetState>> = {};
      for (const id of enabledIds) {
        if (prev[id]) next[id] = prev[id];
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.view, enabledIdsKey]);

  // ---------- load widgets ----------
  useEffect(() => {
    const mySeq = ++reqSeq.current;
    const controllers = new Map<WidgetId, AbortController>();

    const loadOne = async (id: WidgetId) => {
      const ctrl = new AbortController();
      controllers.set(id, ctrl);

      setWidgetsState((prev) => ({
        ...prev,
        [id]: { loading: true, data: prev[id]?.data },
      }));

      try {
        const res = await fetch(`/api/dashboard/widgets/${id}?scope=${dataScope}`, {
          cache: "no-store",
          signal: ctrl.signal,
        });

        const json = (await res.json()) as WidgetApiResponse;
        if (reqSeq.current !== mySeq) return;

        setWidgetsState((prev) => ({
          ...prev,
          [id]: { loading: false, data: json },
        }));
      } catch (err: any) {
        if (ctrl.signal.aborted) return;
        if (reqSeq.current !== mySeq) return;

        setWidgetsState((prev) => ({
          ...prev,
          [id]: {
            loading: false,
            data: {
              ok: false,
              widgetId: id as any,
              error: "Erro ao carregar widget.",
            },
          },
        }));
      }
    };

    enabledIds.forEach((id) => void loadOne(id));

    return () => {
      controllers.forEach((c) => c.abort());
    };
  }, [dataScope, enabledIdsKey, enabledIds]);

  // ---------- preset change (Header) ----------
  const handleViewChange = useCallback((view: DashboardView) => {
    setLayout((prev) => buildPresetLayout(view, prev));
  }, []);

  /**
   * Marca “blocos” de quebra no DOM do dashboard SEM alterar DashboardGrid/WidgetCard.
   * - KPIs: o wrapper que você controla já vai com data-pdf-block
   * - Widgets: marca os wrappers do grid (grid > div) como blocos
   */
  const markDashboardPdfBlocks = useCallback(() => {
    const root = exportRef.current;
    if (!root) return () => {};

    const touched: HTMLElement[] = [];

    // 1) wrappers dos widgets (grid principal do DashboardGrid)
    const widgetWrappers = Array.from(
      root.querySelectorAll(
        // tenta pegar o grid principal e seus filhos diretos (onde cada widget mora)
        'div.grid.grid-cols-1.gap-4.sm\\:grid-cols-2.lg\\:grid-cols-12 > div',
      ),
    ) as HTMLElement[];

    widgetWrappers.forEach((el) => {
      if (el.dataset.pdfBlock !== "true") {
        el.dataset.pdfBlock = "true";
        touched.push(el);
      }
    });

    // cleanup
    return () => {
      touched.forEach((el) => {
        // só remove se foi a gente que setou agora
        if (el.dataset.pdfBlock === "true") delete el.dataset.pdfBlock;
      });
    };
  }, [exportRef]);

const handleExport = useCallback(() => {
  // garante marcação correta dos “blocos” do dashboard (widgets + KPIs)
  const cleanup = markDashboardPdfBlocks();

  void exportPdf({
    filename: `dashboard-${layout.view}-${new Date().toISOString().slice(0, 10)}.pdf`,
    format: "a4",
    orientation: "portrait",
    marginMm: 8,
    scale: 2,
    blockSelector: `[data-pdf-block="true"]`,

    // header/footer no estilo igual ao de Jogadores
    header: {
      title: "Dashboard",
      subtitle:
        layout.view === "serrano"
          ? "Serrano"
          : layout.view === "market"
            ? "Mercado"
            : layout.view === "both"
              ? "Ambos"
              : "Comparativo",
      rightText: new Date().toISOString().slice(0, 10),
    },
    footer: {
      leftText: "Serrano FC",
    },
  }).finally(() => {
    cleanup?.();
  });
}, [exportPdf, layout.view, markDashboardPdfBlocks]);

  return (
    <PlayersDrilldownProvider>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <DashboardHeader
          view={layout.view}
          onViewChange={handleViewChange}
          onOpenPicker={() => setPickerOpen(true)}
          onExport={handleExport}
          exporting={exporting}
          exportError={exportError}
          exportDisabled={kpisLoading}
        />

        {/* ESCOPO EXPORTÁVEL: só conteúdo. */}
        <div ref={exportRef} data-export-scope="dashboard" className="mt-4">
          {/* KPIs como bloco (não corta no meio) */}
          <div data-pdf-block="true">
            <KpiRow data={kpis} loading={kpisLoading} scope={dataScope} />
          </div>

          <div className="mt-4">
            <DashboardGrid
              widgets={enabledWidgets}
              widgetsState={widgetsState}
              layout={layout}
              onChangeLayout={setLayout}
            />
          </div>
        </div>

        <WidgetPickerDrawer
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          layout={layout}
          widgets={widgetsCatalog}
          onChange={setLayout}
        />
      </div>
    </PlayersDrilldownProvider>
  );
}