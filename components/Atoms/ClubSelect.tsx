"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Club = {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
};

function useClickOutside(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return ref;
}

export default function ClubSelect({
  value,
  onChange,
  placeholder = "Selecione um clube",
  allowClear = true,
}: {
  value: string | null | undefined; // clubeId
  onChange: (club: Club | null) => void;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useClickOutside(open, () => setOpen(false));

  useEffect(() => {
    fetch("/api/clubs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setClubs(Array.isArray(d) ? d : []))
      .catch(() => setClubs([]));
  }, []);

  const selected = useMemo(
    () => clubs.find((c) => c.id === value) ?? null,
    [clubs, value]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clubs;
    return clubs.filter(
      (c) =>
        c.nome.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s)
    );
  }, [clubs, q]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-200 rounded-[10px] text-[13px] text-gray-900 hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected?.logoUrl ? (
            <img
              src={selected.logoUrl}
              alt={selected.nome}
              className="w-6 h-6 rounded-full object-contain bg-white border border-gray-100"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 grid place-items-center text-gray-700 font-bold text-xs">
              {selected?.nome?.[0] ?? "?"}
            </div>
          )}

          <span className="truncate">
            {selected ? selected.nome : placeholder}
          </span>
        </div>

        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow z-20 p-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar clube..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none"
          />

          <div className="mt-2 max-h-[260px] overflow-auto">
            {allowClear && (
              <button
                type="button"
                className="w-full text-left px-2.5 py-2 rounded-lg text-[13px] hover:bg-gray-100 text-gray-700"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Remover clube
              </button>
            )}

            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-2.5 py-2 rounded-lg text-[13px] hover:bg-gray-100 flex items-center gap-2"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
              >
                {c.logoUrl ? (
                  <img
                    src={c.logoUrl}
                    alt={c.nome}
                    className="w-6 h-6 rounded-full object-contain bg-white border border-gray-100"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 grid place-items-center text-gray-700 font-bold text-xs">
                    {c.nome?.[0] ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{c.nome}</div>
                  <div className="text-xs text-gray-500 truncate">{c.slug}</div>
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="px-2.5 py-3 text-sm text-gray-500">
                Nenhum clube encontrado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
