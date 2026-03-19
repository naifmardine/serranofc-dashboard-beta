"use client";

import React from "react";
import { cx } from "./utils";

export default function Pill({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx(
        "cursor-pointer rounded-full border px-3 py-1 text-xs transition",
        active
          ? "bg-[#f2cd00] border-[#f2cd00] text-black font-semibold"
          : "border-slate-200 text-slate-800 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}