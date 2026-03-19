"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { cx } from "./utils";
import type { RichOption } from "./utils";

export default function MultiSelectSearch({
  label,
  placeholder = "Buscar...",
  options,
  selected,
  onChange,
  emptyLabel = "Nenhuma opção",
  renderOption,
}: {
  label: string;
  placeholder?: string;
  options: string[] | RichOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel?: string;
  renderOption?: (opt: RichOption, active: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const asRich: RichOption[] = useMemo(() => {
    if (options.length === 0) return [];
    if (typeof (options as any)[0] === "string") {
      return (options as string[]).map((s) => ({ label: s }));
    }
    return options as RichOption[];
  }, [options]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return asRich;
    return asRich.filter((o) => o.label.toLowerCase().includes(qq));
  }, [q, asRich]);

  const toggle = (labelValue: string) => {
    const exists = selected.includes(labelValue);
    const next = exists ? selected.filter((x) => x !== labelValue) : [...selected, labelValue];
    onChange(next);
  };

  const remove = (labelValue: string) => {
    onChange(selected.filter((x) => x !== labelValue));
  };

  return (
    <div className="space-y-2" ref={wrapRef}>
      {!!label && <div className="text-sm font-extrabold text-slate-900">{label}</div>}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left",
          "shadow-sm hover:bg-slate-50",
          "flex items-center justify-between gap-2",
        )}
      >
        <div className="flex flex-wrap gap-2">
          {selected.length === 0 ? (
            <span className="text-sm text-slate-500">Selecionar…</span>
          ) : (
            selected.slice(0, 3).map((s) => (
              <span
                key={s}
                className={cx(
                  "inline-flex items-center gap-1 rounded-full border border-slate-200",
                  "bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-800",
                )}
                title={s}
              >
                <span className="max-w-[140px] truncate">{s}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(s);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(s);
                    }
                  }}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-slate-200"
                  aria-label={`Remover ${s}`}
                >
                  <X size={12} />
                </span>
              </span>
            ))
          )}

          {selected.length > 3 && (
            <span className="text-xs text-slate-500 self-center">+{selected.length - 3}</span>
          )}
        </div>

        <ChevronDown size={16} className={cx("text-slate-500 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="max-h-60 overflow-auto p-2 pt-0">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-sm text-slate-500">{emptyLabel}</div>
            ) : (
              <div className="space-y-1">
                {filtered.map((opt) => {
                  const active = selected.includes(opt.label);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => toggle(opt.label)}
                      className={cx(
                        "w-full cursor-pointer rounded-xl px-2 py-2 text-left text-sm",
                        "hover:bg-slate-50",
                        active && "bg-slate-100",
                      )}
                      title={opt.label}
                    >
                      {renderOption ? (
                        renderOption(opt, active)
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{opt.label}</span>
                          <span className={cx("text-xs font-extrabold", active ? "text-slate-900" : "text-slate-400")}>
                            {active ? "Selecionado" : ""}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 p-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="cursor-pointer rounded-xl px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-xl px-2 py-1 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}