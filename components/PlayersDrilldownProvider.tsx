"use client";

import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import type { Jogador } from "@/type/jogador";
import PlayersModal, { type View } from "@/components/PlayersModal";

type Ctx = {
  openFromRaw: (title: string, rawList: any[]) => Promise<void>;
  openFromIds: (title: string, ids: string[]) => Promise<void>;
  close: () => void;
  isOpen: boolean;
};

const PlayersDrilldownContext = createContext<Ctx | null>(null);

function normalizeJogadorAny(p: any): Jogador {
  const clubeNome =
    p?.clubeNome ?? p?.clubeRef?.nome ?? p?.clube?.nome ?? p?.clube ?? "—";

  const idadeRaw = p?.idade;
  const valorRaw = p?.valorMercado;

  return {
    ...p,
    id: String(p?.id ?? ""),
    nome: p?.nome ?? "",
    idade:
      typeof idadeRaw === "number"
        ? idadeRaw
        : Number.isFinite(Number(idadeRaw))
          ? Number(idadeRaw)
          : 0,
    posicao: (p?.posicao ?? "ATA") as any,
    valorMercado:
      typeof valorRaw === "number"
        ? valorRaw
        : Number.isFinite(Number(valorRaw))
          ? Number(valorRaw)
          : 0,
    peDominante: (p?.peDominante ?? "D") as Jogador["peDominante"],
    numeroCamisa: p?.numeroCamisa ?? null,
    imagemUrl: p?.imagemUrl ?? null,
    altura: p?.altura ?? null,
    situacao: p?.situacao ?? null,
    contratoInicio: p?.contratoInicio ?? null,
    contratoFim: p?.contratoFim ?? null,
    possePct: p?.possePct ?? null,
    clubeNome: clubeNome ?? "—",
    clube: clubeNome ?? "—",
  } as Jogador;
}

function looksLikeFullJogador(p: any) {
  return (
    typeof p?.idade === "number" ||
    typeof p?.valorMercado === "number" ||
    typeof p?.peDominante === "string" ||
    typeof p?.possePct === "number" ||
    typeof p?.altura === "number" ||
    typeof p?.situacao === "string" ||
    p?.representacao != null
  );
}

export function PlayersDrilldownProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>("grid");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [players, setPlayers] = useState<Jogador[]>([]);

  // cache global (1 fetch só)
  const fullByIdRef = useRef<Map<string, Jogador> | null>(null);
  const fullFetchPromiseRef = useRef<Promise<void> | null>(null);

  async function ensureFullIndex() {
    if (fullByIdRef.current) return;
    if (!fullFetchPromiseRef.current) {
      fullFetchPromiseRef.current = (async () => {
        try {
          const res = await fetch("/api/jogadores", { cache: "no-store" });
          const json = await res.json();
          const arr: any[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.jogadores)
              ? json.jogadores
              : [];
          const m = new Map<string, Jogador>();
          for (const raw of arr) {
            const j = normalizeJogadorAny(raw);
            if (j.id) m.set(j.id, j);
          }
          fullByIdRef.current = m;
        } catch {
          fullByIdRef.current = new Map();
        }
      })();
    }
    await fullFetchPromiseRef.current;
  }

  async function openFromRaw(title: string, rawList: any[]) {
    const raw = Array.isArray(rawList) ? rawList : [];
    const needsEnrich = raw.some((p) => !looksLikeFullJogador(p));
    if (needsEnrich) await ensureFullIndex();

    const idx = fullByIdRef.current ?? new Map<string, Jogador>();
    const final = raw.map((p) => {
      const id = String(p?.id ?? "");
      const full = id ? idx.get(id) : undefined;
      return normalizeJogadorAny(full ?? p);
    });

    setTitle(title);
    setPlayers(final);
    setOpen(true);
  }

  async function openFromIds(title: string, ids: string[]) {
    await ensureFullIndex();
    const idx = fullByIdRef.current ?? new Map<string, Jogador>();
    const final = (ids ?? [])
      .map((id) => idx.get(String(id)))
      .filter(Boolean) as Jogador[];

    setTitle(title);
    setPlayers(final);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setPlayers([]);
    setTitle("");
  }

  const value = useMemo<Ctx>(
    () => ({
      openFromRaw,
      openFromIds,
      close,
      isOpen: open,
    }),
    [open],
  );

  return (
    <PlayersDrilldownContext.Provider value={value}>
      {children}

      <PlayersModal
        open={open}
        title={title}
        players={players}
        view={view}
        onView={setView}
        onClose={close}
      />
    </PlayersDrilldownContext.Provider>
  );
}

export function usePlayersDrilldown() {
  const ctx = useContext(PlayersDrilldownContext);
  if (!ctx) throw new Error("usePlayersDrilldown must be used within PlayersDrilldownProvider");
  return ctx;
}
