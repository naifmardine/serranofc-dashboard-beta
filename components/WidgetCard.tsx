"use client";

import type {
  WidgetDefinition,
  WidgetApiResponse,
  WidgetSize,
} from "@/type/dashboard";
import { WidgetRenderer } from "./WidgetRenderer";
import { EmptyState } from "./EmptyState";

type Props = {
  widget: WidgetDefinition;
  loading: boolean;
  data?: WidgetApiResponse;
  size: WidgetSize;
  onSizeChange: (size: WidgetSize) => void;
};

function isGeoMapWidget(widget: WidgetDefinition) {
  const id = String((widget as any)?.id ?? "").toLowerCase();
  const title = String((widget as any)?.title ?? "").toLowerCase();

  if (id.includes("geo") || id.includes("map")) return true;
  if (title.includes("mapa")) return true;

  return false;
}

export function WidgetCard({
  widget,
  loading,
  data,
  size,
  onSizeChange,
}: Props) {
  const isMap = isGeoMapWidget(widget);

  const effectiveSize: WidgetSize = isMap ? "lg" : size;
  const bodyHeightClass = getBodyHeightClass(effectiveSize, isMap);

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {!isMap && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">
              {widget.title}
            </h3>
            {widget.description && (
              <p className="text-xs text-slate-500">
                {widget.description}
              </p>
            )}
          </div>

          <div className="shrink-0">
            <SizeToggle value={effectiveSize} onChange={onSizeChange} />
          </div>
        </div>
      )}

      <div
        className={[
          "relative min-w-0 min-h-0",
          isMap ? "overflow-visible" : "overflow-hidden",
          bodyHeightClass,
        ].join(" ")}
      >
        {loading && <Skeleton />}

        {!loading && data && data.ok === false && (
          <EmptyState
            title="Erro"
            description={data.error ?? "Erro desconhecido"}
          />
        )}

        {!loading && data?.ok && data.payload.kind === "empty" && (
          <EmptyState
            title="Sem dados"
            description={data.payload.reason}
            hint={data.payload.hint}
          />
        )}

        {!loading && data?.ok && data.payload.kind !== "empty" && (
          <div className="h-full w-full min-w-0 min-h-0">
            <WidgetRenderer payload={data.payload} size={effectiveSize} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle de tamanho corrigido (não quebra layout)                    */
/* ------------------------------------------------------------------ */

function SizeToggle({
  value,
  onChange,
}: {
  value: "sm" | "md" | "lg";
  onChange: (v: "sm" | "md" | "lg") => void;
}) {
  const items: Array<{ id: "sm" | "md" | "lg"; label: string }> = [
    { id: "sm", label: "SM" },
    { id: "md", label: "MD" },
    { id: "lg", label: "LG" },
  ];

  return (
    <div
      className={[
        "inline-flex items-center",
        "flex-nowrap whitespace-nowrap",
        "rounded-lg border border-slate-200 bg-white p-1",
        "shadow-sm",
      ].join(" ")}
      aria-label="Tamanho do widget"
    >
      {items.map((it) => {
        const active = it.id === value;

        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={[
              "h-7 w-10",
              "rounded-md text-[11px] font-bold",
              "transition focus:outline-none",
              active
                ? "bg-[#F2CD00] text-slate-900"
                : "text-slate-700 hover:bg-slate-50",
            ].join(" ")}
            aria-pressed={active}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alturas                                                             */
/* ------------------------------------------------------------------ */

function getBodyHeightClass(size: WidgetSize, isMap: boolean) {
  if (isMap) {
    switch (size) {
      case "sm":
        return "h-[340px]";
      case "md":
        return "h-[520px]";
      case "lg":
        return "h-[660px]";
      default:
        return "h-[560px]";
    }
  }

  switch (size) {
    case "sm":
      return "h-[240px]";
    case "md":
      return "h-[360px]";
    case "lg":
      return "h-[460px]";
    default:
      return "h-[360px]";
  }
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="h-full w-full animate-pulse">
      <div className="h-full w-full rounded-lg bg-slate-100" />
    </div>
  );
}