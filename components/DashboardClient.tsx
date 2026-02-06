"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardGrid } from "./DashboardGrid";
import { WidgetPickerDrawer } from "./WidgetPickerDrawer";
import { KpiRow } from "./KpiRow";

import { WIDGETS } from "@/lib/dashboard/widgetDefinitions";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  loadLayoutFromStorage,
  saveLayoutToStorage,
} from "@/lib/dashboard/layoutStorage";

import type {
  DashboardLayout,
  KpisApiResponse,
  WidgetApiResponse,
  WidgetDefinition,
  WidgetId,
  WidgetScope,
} from "@/type/dashboard";

type WidgetState = {
  loading: boolean;
  data?: WidgetApiResponse;
};

function isWidgetApplicable(widgetScope: WidgetScope, currentScope: WidgetScope) {
  if (currentScope === "both") return true;
  return widgetScope === currentScope;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export function DashboardClient() {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [kpis, setKpis] = useState<KpisApiResponse | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  const [widgetsState, setWidgetsState] = useState<
    Partial<Record<WidgetId, WidgetState>>
  >({});

  const reqSeq = useRef(0);

  // ---------- init layout ----------
  useEffect(() => {
    const stored = loadLayoutFromStorage();
    if (stored) setLayout(stored);
  }, []);

  // ---------- persist layout ----------
  useEffect(() => {
    saveLayoutToStorage(layout);
  }, [layout]);

  // ---------- catalog (SEM KPIs) ----------
  const widgetsCatalog: WidgetDefinition[] = useMemo(() => {
    return WIDGETS.filter((w) => !w.id.startsWith("kpi."));
  }, []);

  // ---------- enabled + ordered + applicable ----------
  const enabledWidgets = useMemo(() => {
    const enabledSet = new Set(layout.enabled);
    const orderedEnabledIds = uniq(layout.order).filter((id) => enabledSet.has(id));

    const map = new Map(widgetsCatalog.map((w) => [w.id, w]));
    const full = orderedEnabledIds
      .map((id) => map.get(id))
      .filter(Boolean) as WidgetDefinition[];

    return full.filter((w) => isWidgetApplicable(w.scope, layout.scope));
  }, [layout.enabled, layout.order, layout.scope, widgetsCatalog]);

  const enabledIds = useMemo(
    () => enabledWidgets.map((w) => w.id),
    [enabledWidgets],
  );

  // ---------- load KPIs ----------
  useEffect(() => {
    let cancelled = false;

    async function run(scope: WidgetScope) {
      setKpisLoading(true);
      try {
        const res = await fetch(`/api/dashboard/kpis?scope=${scope}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as KpisApiResponse;
        if (!cancelled) setKpis(json);
      } catch {
        if (!cancelled) setKpis({ ok: false, error: "Erro ao carregar KPIs." } as any);
      } finally {
        if (!cancelled) setKpisLoading(false);
      }
    }

    run(layout.scope);
    return () => {
      cancelled = true;
    };
  }, [layout.scope]);

  // ---------- quando scope muda: limpa state “fora do escopo” ----------
  useEffect(() => {
    setWidgetsState((prev) => {
      const next: Partial<Record<WidgetId, WidgetState>> = {};
      for (const id of enabledIds) {
        if (prev[id]) next[id] = prev[id];
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.scope, enabledIds.join("|")]);

  // ---------- load widgets ----------
  useEffect(() => {
    const mySeq = ++reqSeq.current;
    const controllers = new Map<WidgetId, AbortController>();

    async function loadOne(id: WidgetId) {
      const ctrl = new AbortController();
      controllers.set(id, ctrl);

      setWidgetsState((prev) => ({
        ...prev,
        [id]: { loading: true, data: prev[id]?.data },
      }));

      try {
        const res = await fetch(`/api/dashboard/widgets/${id}?scope=${layout.scope}`, {
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
            data: { ok: false, widgetId: id as any, error: "Erro ao carregar widget." },
          },
        }));
      }
    }

    enabledIds.forEach((id) => loadOne(id));

    return () => {
      controllers.forEach((c) => c.abort());
    };
  }, [layout.scope, enabledIds]);

  const handleScopeChange = (scope: WidgetScope) => {
    setLayout((prev) => ({ ...prev, scope }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <DashboardHeader
        scope={layout.scope}
        onScopeChange={handleScopeChange}
        onOpenPicker={() => setPickerOpen(true)}
      />

      {/* KPIs */}
      <div className="mt-4">
        <KpiRow data={kpis} loading={kpisLoading} />
      </div>

      {/* Widgets */}
      <div className="mt-4">
        <DashboardGrid
          widgets={enabledWidgets}
          widgetsState={widgetsState}
          layout={layout}
          onChangeLayout={setLayout}
        />
      </div>

      <WidgetPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        layout={layout}
        widgets={widgetsCatalog}
        onChange={setLayout}
      />
    </div>
  );
}
