// components/Atoms/SuccessDialog.tsx
"use client";

import { CheckCircle2 } from "lucide-react";

type SuccessDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export default function SuccessDialog({
  open,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: SuccessDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-emerald-100">
        <div className="flex gap-3 mb-4">
          <div className="mt-1">
            <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            className="rounded-lg bg-[#003399] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#002774]"
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
