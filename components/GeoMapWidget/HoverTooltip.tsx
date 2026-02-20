"use client";

import React from "react";

export type TipMeta = {
  show: boolean;
  title: string;
  subtitle?: string;
  hint?: string;
};

export default function HoverTooltip({
  meta,
  elRef,
}: {
  meta: TipMeta;
  elRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!meta.show) return null;

  return (
    <div
      ref={elRef}
      className="pointer-events-none absolute z-60 w-[260px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
      style={{
        transform: "translate3d(0px,0px,0px)",
        willChange: "transform",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {meta.title}
          </div>
          {meta.subtitle ? (
            <div className="mt-0.5 text-xs text-slate-500">{meta.subtitle}</div>
          ) : null}
        </div>
        <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#f2cd00]" />
      </div>

      {meta.hint ? (
        <div className="mt-2 text-[11px] font-medium text-slate-700">
          {meta.hint}
        </div>
      ) : null}
    </div>
  );
}
