"use client";

import type { WidgetDefinition, WidgetApiResponse, WidgetSize } from "@/type/dashboard";
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

  // heurística pragmática pra NÃO precisar mexer em mais nada:
  // - pega ids comuns (geo/map) e também título "mapa"
  if (id.includes("geo") || id.includes("map")) return true;
  if (title.includes("mapa")) return true;

  return false;
}

export function WidgetCard({ widget, loading, data, size, onSizeChange }: Props) {
  const isMap = isGeoMapWidget(widget);

  const bodyHeightClass = getBodyHeightClass(size, isMap);

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{widget.title}</h3>
          {widget.description && <p className="text-xs text-slate-500">{widget.description}</p>}
        </div>

        <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-1">
          <SizeButton active={size === "sm"} onClick={() => onSizeChange("sm")}>
            SM
          </SizeButton>
          <SizeButton active={size === "md"} onClick={() => onSizeChange("md")}>
            MD
          </SizeButton>
          <SizeButton active={size === "lg"} onClick={() => onSizeChange("lg")}>
            LG
          </SizeButton>
        </div>
      </div>

      {/* Body */}
      <div
        className={[
          "relative min-w-0 min-h-0",
          // mapa precisa respirar mais e não ser clipado (senão parece “cortado”)
          isMap ? "overflow-visible" : "overflow-hidden",
          bodyHeightClass,
        ].join(" ")}
      >
        {loading && <Skeleton />}

        {!loading && data && data.ok === false && (
          <EmptyState title="Erro" description={data.error ?? "Erro desconhecido"} />
        )}

        {!loading && data?.ok && data.payload.kind === "empty" && (
          <EmptyState title="Sem dados" description={data.payload.reason} hint={data.payload.hint} />
        )}

        {!loading && data?.ok && data.payload.kind !== "empty" && (
          <div className="h-full w-full min-w-0 min-h-0">
            <WidgetRenderer payload={data.payload} size={size} />
          </div>
        )}
      </div>
    </div>
  );
}

function SizeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md px-2 py-1 text-xs transition",
        active ? "bg-[#F2CD00] text-slate-900" : "text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function getBodyHeightClass(size: WidgetSize, isMap: boolean) {
  // EXCEÇÃO: o mapa precisa de mais altura real (senão parece recortado e o “zoom” não aparece)
  if (isMap) {
    switch (size) {
      case "sm":
        return "h-[340px]";
      case "md":
        return "h-[520px]";
      case "lg":
        return "h-[680px]";
      default:
        return "h-[520px]";
    }
  }

  // padrão antigo pros demais widgets
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

function Skeleton() {
  return (
    <div className="h-full w-full animate-pulse">
      <div className="h-full w-full rounded-lg bg-slate-100" />
    </div>
  );
}
