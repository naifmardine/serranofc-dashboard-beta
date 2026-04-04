"use client";

import React from "react";
import { useI18n } from "@/contexts/I18nContext";

type CrumbBase = string;

type Props = {
  title: string;
  base?: CrumbBase;
  subtitle?: string;

  // novo: botão central (ex: Export PDF)
  centerActions?: React.ReactNode;

  // novo: ações da direita (tabs, widgets, etc.)
  rightActions?: React.ReactNode;

  // compat: se você já usa "actions" em outras telas,
  // a gente mantém como alias de rightActions
  actions?: React.ReactNode;

  crumbLabel?: string;
  className?: string;
};

export default function PageTitle({
  title,
  base,
  subtitle,
  centerActions,
  rightActions,
  actions,
  crumbLabel,
  className,
}: Props) {
  const { t } = useI18n();
  const resolvedBase = base ?? t.common.principal;
  const pageLabel = crumbLabel ?? title;
  const resolvedRight = rightActions ?? actions;

  return (
    <header className={["w-full", className].filter(Boolean).join(" ")}>
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-xs font-medium text-slate-500"
        aria-label="Breadcrumb"
      >
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#003399]" />
          <span>{resolvedBase}</span>
        </span>

        <span className="text-slate-500">›</span>

        <span className="text-slate-900">{pageLabel}</span>
      </nav>

      {/* Title row (3 zonas reais) */}
      <div className="relative mt-2">
        {/* centro absoluto */}
        {centerActions ? (
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2">
            <div className="pointer-events-auto">{centerActions}</div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* esquerda */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
              <span className="hidden h-6 w-px bg-slate-200 sm:inline-block" />
              <span className="hidden text-sm font-medium text-slate-500 sm:inline">
                {t.sidebar.serranFC}
              </span>
            </div>

            {subtitle ? (
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {subtitle}
              </p>
            ) : null}
          </div>

          {/* direita */}
          {resolvedRight ? (
            <div className="sm:ml-auto flex shrink-0 items-center gap-2">
              {resolvedRight}
            </div>
          ) : null}
        </div>
      </div>

      {/* Divider */}
      <div className="mt-4 h-px w-full bg-slate-200" />
    </header>
  );
}