"use client";

type Props = {
  title: string;
  description?: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Empty / Error / Loading state reutilizável
 * - Visual neutro e leve
 * - Serve para: sem dados, erro, dashboard vazio
 */
export function EmptyState({
  title,
  description,
  hint,
  actionLabel,
  onAction,
}: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div className="text-sm font-medium text-slate-900">
        {title}
      </div>

      {description && (
        <div className="text-xs text-slate-500 max-w-xs">
          {description}
        </div>
      )}

      {hint && (
        <div className="text-xs text-slate-400 max-w-xs">
          {hint}
        </div>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
