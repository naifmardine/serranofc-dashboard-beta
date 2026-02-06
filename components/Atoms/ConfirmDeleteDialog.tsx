"use client";

import { useEffect, useMemo, useState } from "react";

export default function ConfirmDeleteDialog({
  open,
  title = "Confirmar deleção",
  description,
  expectedPhrase,
  itemName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  description?: string;
  expectedPhrase: string; // ex: `DELETAR ${nome}`
  itemName?: string; // só pra exibir
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setErr(null);
      setLoading(false);
    }
  }, [open]);

  const canConfirm = useMemo(() => {
    return text.trim() === expectedPhrase.trim();
  }, [text, expectedPhrase]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/45"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />

      {/* modal */}
      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="w-full max-w-[520px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="text-sm font-extrabold text-slate-900">{title}</div>
            {description && (
              <div className="mt-1 text-xs text-gray-600">{description}</div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {itemName && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-gray-500">
                  Você está deletando
                </div>
                <div className="text-sm font-bold text-slate-900">{itemName}</div>
              </div>
            )}

            <div className="text-xs text-gray-600">
              Para confirmar, digite exatamente:
              <div className="mt-1 font-extrabold text-red-700 select-all">
                {expectedPhrase}
              </div>
            </div>

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 placeholder:text-gray-400"
              placeholder="Digite aqui..."
              autoFocus
            />

            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {err}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (!loading) onCancel();
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={!canConfirm || loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  setErr(null);
                  await onConfirm();
                } catch (e: any) {
                  setErr(e?.message ?? "Erro ao deletar.");
                } finally {
                  setLoading(false);
                }
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Deletando..." : "Deletar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
