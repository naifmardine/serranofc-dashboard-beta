// components/GeoMapWidget/index.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

import type { GeoMapData, WidgetSize } from "@/type/dashboard";

import HoverTooltip, { type TipMeta } from "./HoverTooltip";
import MapCanvas from "./MapCanvas";

import type { ContinentCode, Mode } from "./geoAdapters";
import { buildNameToISO2, MAP_DATA } from "./geoAdapters";
import { useFitProjection } from "./useFitProjection";
import { COUNTRY_OPTIONS } from "@/lib/dashboard/geoOptions";
import { usePlayersDrilldown } from "@/components/PlayersDrilldownProvider";

type Props = {
  data: GeoMapData;
  size?: WidgetSize;
};

function labelFromMode(mode: Mode) {
  if (mode === "WORLD") return "Mundo";
  if (mode === "BR") return "Brasil";
  const map: Record<ContinentCode, string> = {
    SA: "América do Sul",
    NA: "América do Norte",
    EU: "Europa",
    AF: "África",
    AS: "Ásia",
    OC: "Oceania",
  };
  return map[mode as ContinentCode] ?? "Mapa";
}

export default function GeoMapWidget({ data, size = "md" }: Props) {
  const drill = usePlayersDrilldown();

  const [mode, setMode] = useState<Mode>("WORLD");
  const [prevContinent, setPrevContinent] = useState<ContinentCode>("SA"); // voltar do BR

  // dimension tracking
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const w = Math.max(0, Math.floor(r.width));
      const h = Math.max(0, Math.floor(r.height));
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = box.w > 10 && box.h > 10;

  // name -> ISO2 (whitelist)
  const nameToISO2 = useMemo(() => {
    return buildNameToISO2(
      COUNTRY_OPTIONS.map((c) => ({ code: c.code, name: c.name })),
    );
  }, []);

  // data
  const byCountry = data?.counts?.byCountry ?? {};
  const byUF = data?.counts?.byStateBR ?? {};
  const playersByCountry = data?.players?.byCountry ?? {};
  const playersByUF = data?.players?.byStateBR ?? {};

  // soma de jogadores no BR via UF (se existir)
  const brFromUF = useMemo(() => {
    let sum = 0;
    for (const v of Object.values(byUF)) sum += Number(v ?? 0);
    return sum;
  }, [byUF]);

  const countriesWithPlayers = useMemo(() => {
    const s = new Set<string>();
    for (const [k, v] of Object.entries(byCountry)) {
      if ((v ?? 0) > 0) s.add(String(k).toUpperCase());
    }
    return s;
  }, [byCountry]);

  const ufsWithPlayers = useMemo(() => {
    const s = new Set<string>();
    for (const [k, v] of Object.entries(byUF)) {
      if ((v ?? 0) > 0) s.add(String(k).toUpperCase());
    }
    return s;
  }, [byUF]);

  // FC vem do import (sem fetch)
  const fc = useMemo(() => MAP_DATA[mode], [mode]);

  // projeção usa FC
  const projection = useFitProjection(ready, mode, box, fc);

  const continentByCountry = useMemo(() => {
    const m = new Map<string, ContinentCode>();
    for (const c of COUNTRY_OPTIONS) {
      m.set(String(c.code).toUpperCase(), c.continent as ContinentCode);
    }
    return m;
  }, []);

  const continentsWithPlayers = useMemo(() => {
    const s = new Set<ContinentCode>();

    for (const iso2 of countriesWithPlayers) {
      const cont = continentByCountry.get(iso2);
      if (cont) s.add(cont);
    }

    // redundante mas seguro: se tem UF, South America deve estar ativo
    if (brFromUF > 0) s.add("SA");

    return s;
  }, [countriesWithPlayers, continentByCountry, brFromUF]);

  // ---------- Tooltip imperativo ----------
  const [tipMeta, setTipMeta] = useState<TipMeta>({
    show: false,
    title: "",
    subtitle: "",
    hint: "",
  });
  const tipElRef = useRef<HTMLDivElement | null>(null);

  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);
  const hideTRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hideTRef.current) window.clearTimeout(hideTRef.current);
    };
  }, []);

  // quando o modal global abrir, some o tooltip
  useEffect(() => {
    if (!drill.isOpen) return;
    setTipMeta((prev) => (prev.show ? { ...prev, show: false } : prev));
  }, [drill.isOpen]);

  const setTipPosition = (clientX: number, clientY: number) => {
    const el = tipElRef.current;
    const boxEl = boxRef.current;
    if (!el || !boxEl) return;

    const rect = boxEl.getBoundingClientRect();
    const offset = 14;

    let x = Math.round(clientX - rect.left + offset);
    let y = Math.round(clientY - rect.top + offset);

    const pad = 10;
    const maxX = rect.width - el.offsetWidth - pad;
    const maxY = rect.height - el.offsetHeight - pad;

    x = Math.max(pad, Math.min(x, maxX));
    y = Math.max(pad, Math.min(y, maxY));

    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const onHover = (
    e: React.MouseEvent,
    meta: { title: string; subtitle: string; hint: string },
  ) => {
    if (hideTRef.current) {
      window.clearTimeout(hideTRef.current);
      hideTRef.current = null;
    }
    pendingPosRef.current = { x: e.clientX, y: e.clientY };
    setTipMeta({ show: true, ...meta });
  };

  useEffect(() => {
    if (!tipMeta.show) return;
    const p = pendingPosRef.current;
    if (!p) return;
    const id = requestAnimationFrame(() => setTipPosition(p.x, p.y));
    return () => cancelAnimationFrame(id);
  }, [tipMeta.show]);

  const onMove = (e: React.MouseEvent) => {
    if (!tipMeta.show) return;
    pendingPosRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pendingPosRef.current;
      if (!p) return;
      setTipPosition(p.x, p.y);
    });
  };

  const onLeave = () => {
    if (hideTRef.current) window.clearTimeout(hideTRef.current);
    hideTRef.current = window.setTimeout(() => {
      setTipMeta((prev) => (prev.show ? { ...prev, show: false } : prev));
      hideTRef.current = null;
    }, 40);
  };

  const back = () => {
    onLeave();
    if (mode === "BR") {
      setMode(prevContinent);
      return;
    }
    if (mode !== "WORLD") {
      setMode("WORLD");
    }
  };

  const subtitleLabel = labelFromMode(mode);

  // (size) não usado aqui, mas mantenho o prop por compatibilidade
  void size;

  return (
    <>
      <HoverTooltip meta={tipMeta} elRef={tipElRef} />

      <div className="relative h-full w-full">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Mapa</div>
            <div className="mt-1 text-xs text-gray-500">{subtitleLabel}</div>
          </div>

          {mode !== "WORLD" && (
            <button
              type="button"
              onClick={back}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/25 bg-[#003399] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#002774]"
              title="Voltar"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          )}
        </div>

        <div
          ref={boxRef}
          className="relative h-[calc(100%-40px)] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white"
        >
          {!ready || !projection || !fc ? null : (
            <MapCanvas
              mode={mode}
              box={box}
              projection={projection}
              byCountry={byCountry}
              byUF={byUF}
              continentsWithPlayers={continentsWithPlayers}
              countriesWithPlayers={countriesWithPlayers}
              ufsWithPlayers={ufsWithPlayers}
              nameToISO2={nameToISO2}
              onHover={onHover}
              onMove={onMove}
              onLeave={onLeave}
              onSelectContinent={(c) => setMode(c)}
              onSelectCountry={(iso2, label) => {
                if (iso2 === "BR") {
                  setPrevContinent(mode === "WORLD" ? "SA" : (mode as ContinentCode));
                  setMode("BR");
                  return;
                }

                void drill.openFromRaw(
                  `País: ${label} (${iso2})`,
                  playersByCountry[iso2] ?? [],
                );
              }}
              onSelectUF={(uf, label) => {
                void drill.openFromRaw(`UF: ${label} (${uf})`, playersByUF[uf] ?? []);
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
