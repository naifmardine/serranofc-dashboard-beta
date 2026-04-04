"use client";

import React from "react";
import { useI18n } from "@/contexts/I18nContext";

const SERRANO_BLUE = "#003399";
const SERRANO_YELLOW = "#F2CD00";

type Props = {
  onClick: () => void;
  loading?: boolean;
  subtitle?: string;
  disabled?: boolean;
  className?: string;
};

export default function ExportPrintButton({
  onClick,
  loading,
  subtitle,
  disabled,
  className,
}: Props) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-no-export="true"
      className={[
        "group relative z-10 select-none",
        "rounded-xl border border-slate-200",
        "shadow-sm transition",
        "hover:shadow-[0_18px_40px_rgba(0,0,0,0.14)]",
        "disabled:opacity-70 disabled:cursor-not-allowed",
        "cursor-pointer",
        className ?? "",
      ].join(" ")}
      aria-label={t.exportPdf.exportar}
      title={t.exportPdf.exportar}
    >
      <div
        className="relative z-10 flex min-h-11 items-center justify-between gap-3 rounded-xl px-4"
        style={{
          backgroundColor: SERRANO_BLUE,
          border: `1px solid ${SERRANO_BLUE}33`,
        }}
      >
        <div className="flex items-center gap-2">
          <DocsIcon />
          <div className="leading-tight text-left">
            <div className="text-sm font-extrabold text-white">
              {loading ? t.exportPdf.gerando : t.exportPdf.exportar}
            </div>
            <div className="text-[11px] font-semibold text-white/80">
              {loading ? t.exportPdf.aguarde : (subtitle ?? t.exportPdf.baixar)}
            </div>
          </div>
        </div>

        <span
          className={[
            "rounded-full px-2 py-0.5 text-[11px] font-extrabold",
            "opacity-0 transition-all duration-200",
            "group-hover:opacity-100",
          ].join(" ")}
          style={{ backgroundColor: "rgba(255,255,255,0.14)", color: "white" }}
        >
          {loading ? "..." : t.exportPdf.download}
        </span>
      </div>

      <div
        className={[
          "absolute inset-0 z-0 mx-auto flex max-w-[92%] items-center justify-center",
          "rounded-xl border transition-transform duration-500",
          "translate-y-0 group-hover:translate-y-full",
        ].join(" ")}
        style={{
          backgroundColor: SERRANO_YELLOW,
          borderColor: `${SERRANO_YELLOW}66`,
        }}
        aria-hidden
      >
        <DownloadIcon />
      </div>
    </button>
  );
}

function DocsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: SERRANO_YELLOW }}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-bounce"
      style={{ color: SERRANO_BLUE }}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  );
}
