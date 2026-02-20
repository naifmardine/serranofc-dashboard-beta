"use client";

import React from "react";
import { LayoutGrid, List, X } from "lucide-react";
import type { Jogador } from "@/type/jogador";
import Card from "@/components/Card";
import PlayerRow from "@/components/PlayerRow";

export type View = "grid" | "list";

const SERRANO_BLUE = "#003399";
const SERRANO_YELLOW = "#F2CD00";

export default function PlayersModal({
  open,
  title,
  players,
  view,
  onView,
  onClose,
}: {
  open: boolean;
  title: string;
  players: Jogador[];
  view: View;
  onView: (v: View) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="h-[90vh] w-[95vw] max-w-[1200px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SERRANO_BLUE }}
              />
              <div className="truncate text-sm font-extrabold text-slate-900">
                {title}
              </div>

              <span className="hidden h-5 w-px bg-slate-200 sm:inline-block" />

              <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700">
                {players.length} jogador{players.length === 1 ? "" : "es"}
              </span>
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Visualize em cards ou lista. Feche quando terminar.
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented View Toggle */}
            <div
              className="inline-flex overflow-hidden rounded-xl border border-gray-200 bg-white"
              role="group"
              aria-label="Alternar visualização"
            >
              <button
                type="button"
                onClick={() => onView("grid")}
                aria-pressed={view === "grid"}
                className={[
                  "flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors",
                  "hover:bg-gray-50",
                  view === "grid" ? "text-black" : "text-slate-800",
                ].join(" ")}
                style={view === "grid" ? { backgroundColor: SERRANO_YELLOW } : undefined}
                title="Exibir em cards"
              >
                <LayoutGrid size={16} />
                Cards
              </button>

              <button
                type="button"
                onClick={() => onView("list")}
                aria-pressed={view === "list"}
                className={[
                  "flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors",
                  "hover:bg-gray-50",
                  view === "list" ? "text-black" : "text-slate-800",
                ].join(" ")}
                style={view === "list" ? { backgroundColor: SERRANO_YELLOW } : undefined}
                title="Exibir em lista"
              >
                <List size={16} />
                Lista
              </button>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-white/20 px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:opacity-95"
              style={{ backgroundColor: SERRANO_BLUE }}
              title="Fechar"
              aria-label="Fechar modal"
            >
              <span className="inline-flex items-center gap-2">
                <X size={16} />
                Fechar
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(90vh-68px)] overflow-auto px-4 py-4">
          {players.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Nenhum jogador encontrado.
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {players.map((p) => (
                <Card key={p.id} player={p} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <thead>
                  <tr>
                    <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                      Jogador
                    </th>
                    <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                      Clube
                    </th>
                    <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                      Idade
                    </th>
                    <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                      Pé
                    </th>
                    <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                      Altura
                    </th>
                    <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                      Situação
                    </th>
                    <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                      Valor
                    </th>
                    <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                      Posse
                    </th>
                  </tr>

                  {/* Linha amarela fina estilo Serrano */}
                  <tr className="h-0">
                    <th colSpan={8} className="h-0 border-none p-0">
                      <div
                        className="block h-[3px] w-full"
                        style={{ backgroundColor: SERRANO_YELLOW }}
                      />
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {players.map((p) => (
                    <PlayerRow key={p.id} player={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
