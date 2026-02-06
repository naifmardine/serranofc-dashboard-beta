"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopySecretDialog({
  open,
  title = "Credenciais geradas",
  description = "Copie e envie para o usuário. Por segurança, isso não ficará salvo aqui.",
  payloadTitle = "Copiar",
  payload,
  onClose,
}: {
  open: boolean;
  title?: string;
  description?: string;
  payloadTitle?: string;
  payload: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const lines = useMemo(() => payload.split("\n"), [payload]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/45"
        onClick={() => onClose()}
      />

      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="w-full max-w-[560px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="text-sm font-extrabold text-slate-900">{title}</div>
            <div className="mt-1 text-xs text-gray-600">{description}</div>
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wider text-gray-500">
                {payloadTitle}
              </div>

              <pre className="mt-1 whitespace-pre-wrap wrap-break-word text-sm font-semibold text-slate-900">
                {lines.map((l, idx) => (
                  <div key={idx}>{l}</div>
                ))}
              </pre>
            </div>

            <div className="text-xs text-gray-500">
              Dica: envie pelo canal mais seguro possível. Evite mandar em grupo.
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(payload);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg bg-[#f2d249] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f]"
            >
              <span className="inline-flex items-center gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
