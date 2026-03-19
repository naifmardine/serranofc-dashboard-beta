"use client";

import React from "react";
import { cx, SERRANO_BLUE } from "./utils";

export function PrimaryBlueButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "cursor-pointer h-10 rounded-xl px-4 text-sm font-extrabold text-white transition",
        "disabled:opacity-60 disabled:cursor-not-allowed",
      )}
      style={{ backgroundColor: SERRANO_BLUE }}
    >
      {children}
    </button>
  );
}

export function SecondaryBlueButton({
  children,
  onClick,
  title,
}: {
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
        "cursor-pointer h-10 rounded-xl border px-3 text-sm font-semibold transition",
        "hover:bg-slate-50",
      )}
      style={{ borderColor: `${SERRANO_BLUE}40`, color: SERRANO_BLUE }}
    >
      {children}
    </button>
  );
}