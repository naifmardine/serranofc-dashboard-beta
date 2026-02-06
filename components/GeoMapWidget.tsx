"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "@vnedyalk0v/react19-simple-maps";
import { LayoutGrid, List, X, ArrowLeft } from "lucide-react";
import { geoEqualEarth, geoMercator, type GeoProjection } from "d3-geo";

import type { GeoMapData, WidgetSize } from "@/type/dashboard";
import type { Jogador } from "@/type/jogador";

import Card from "@/components/Card";
import PlayerRow from "@/components/PlayerRow";

// ✅ datasets
import worldGeo from "public/maps/world-countries.json";
import brGeo from "public/maps/br-states.json";

type Mode = "WORLD" | "CONTINENT_EUROPE" | "CONTINENT_SOUTH_AMERICA" | "BR";
type View = "grid" | "list";

type Props = {
  data: GeoMapData;
  size?: WidgetSize;
};

/* -----------------------------
 * Utils
 * ----------------------------- */
function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

function getCountryName(geo: any) {
  const p = geo?.properties ?? {};
  return safeStr(p.name ?? p.NAME ?? p.ADMIN ?? p.admin ?? "");
}

function getStateName(geo: any) {
  const p = geo?.properties ?? {};
  return safeStr(p.nome ?? p.NAME ?? p.name ?? "");
}

function geoKey(geo: any, idx: number) {
  const id = safeStr(geo?.id);
  const a2 = safeStr(
    geo?.properties?.["ISO3166-1-Alpha-2"] ??
      geo?.properties?.ISO_A2 ??
      geo?.properties?.iso_a2 ??
      geo?.properties?.["iso_a2"] ??
      "",
  );
  const name = safeStr(geo?.properties?.name ?? geo?.properties?.NAME ?? "");
  return `geo-${idx}-${id || "x"}-${a2 || "na"}-${name || "y"}`;
}

function getISO2FromWorldGeo(geo: any): string {
  const p = geo?.properties ?? {};
  const a2 = safeStr(
    p["ISO3166-1-Alpha-2"] ?? p.ISO_A2 ?? p.iso_a2 ?? p["iso_a2"],
  ).toUpperCase();

  if (!a2 || a2 === "-99" || a2 === "ZZ") return "";
  return a2;
}

function getUfFromBrGeo(geo: any): string {
  const p = geo?.properties ?? {};
  return safeStr(p.sigla || p.UF || p.uf || p.postal).toUpperCase();
}

// bbox center — usado pra heurística de continente
function getBboxCenter(geo: any): { lon: number; lat: number } | null {
  const coords = geo?.geometry?.coordinates;
  if (!coords) return null;

  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  const walk = (c: any) => {
    if (!c) return;
    if (typeof c[0] === "number" && typeof c[1] === "number") {
      const lon = c[0];
      const lat = c[1];
      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      return;
    }
    if (Array.isArray(c)) c.forEach(walk);
  };

  walk(coords);

  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) return null;
  return { lon: (minLon + maxLon) / 2, lat: (minLat + maxLat) / 2 };
}

type Continent = "EUROPE" | "SOUTH_AMERICA" | "OTHER";

function continentFromGeo(geo: any): Continent {
  const ctr = getBboxCenter(geo);
  if (!ctr) return "OTHER";

  const { lon, lat } = ctr;

  if (lat >= 35 && lat <= 72 && lon >= -25 && lon <= 45) return "EUROPE";
  if (lat >= -60 && lat <= 15 && lon >= -92 && lon <= -30)
    return "SOUTH_AMERICA";

  return "OTHER";
}

function modeToContinent(mode: Mode): Continent | null {
  if (mode === "CONTINENT_EUROPE") return "EUROPE";
  if (mode === "CONTINENT_SOUTH_AMERICA") return "SOUTH_AMERICA";
  return null;
}

/* -----------------------------
 * Player normalization / enrichment
 * ----------------------------- */
function normalizeJogadorAny(p: any): Jogador {
  const clubeNome =
    p?.clubeNome ?? p?.clubeRef?.nome ?? p?.clube?.nome ?? p?.clube ?? "—";

  const representacao =
    p?.representacao ??
    p?.empresario ??
    p?.agencia ??
    p?.agency ??
    p?.["representação"] ??
    null;

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

    representacao: representacao ?? null,
    numeroCamisa: p?.numeroCamisa ?? null,
    imagemUrl: p?.imagemUrl ?? null,
    altura: p?.altura ?? null,
    situacao: p?.situacao ?? null,
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

/* -----------------------------
 * Modal overlay
 * ----------------------------- */
function PlayersModal({
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
      <div className="h-[90vh] w-[95vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {title}
            </div>
            <div className="text-xs text-gray-500">
              {players.length} jogadores
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white"
              role="group"
              aria-label="Alternar visualização"
            >
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-gray-100 ${
                  view === "grid" ? "bg-[#f2cd00] font-bold text-black" : ""
                }`}
                onClick={() => onView("grid")}
                aria-pressed={view === "grid"}
              >
                <LayoutGrid size={16} />
                Cards
              </button>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-gray-100 ${
                  view === "list" ? "bg-[#f2cd00] font-bold text-black" : ""
                }`}
                onClick={() => onView("list")}
                aria-pressed={view === "list"}
              >
                <List size={16} />
                Lista
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white p-2 text-slate-900 hover:bg-gray-50"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="h-[calc(90vh-56px)] overflow-auto p-4">
          {players.length === 0 ? (
            <div className="text-sm text-gray-600">
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
              <table className="w-full border-collapse overflow-hidden rounded-[10px] bg-white">
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

/* -----------------------------
 * Tooltip (imperativo / ultra leve)
 * ----------------------------- */
type TipMeta = {
  show: boolean;
  title: string;
  subtitle?: string;
  hint?: string;
};

function HoverTooltip({
  meta,
  elRef,
}: {
  meta: TipMeta;
  elRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!meta.show) return null;

  return (
    <div
      ref={elRef}
      className="pointer-events-none absolute z-60 w-[260px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
      style={{
        transform: "translate3d(0px,0px,0px)",
        willChange: "transform",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {meta.title}
          </div>
          {meta.subtitle ? (
            <div className="mt-0.5 text-xs text-slate-500">{meta.subtitle}</div>
          ) : null}
        </div>
        <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#f2cd00]" />
      </div>

      {meta.hint ? (
        <div className="mt-2 text-[11px] font-medium text-slate-700">
          {meta.hint}
        </div>
      ) : null}
    </div>
  );
}

/* -----------------------------
 * Main component
 * ----------------------------- */
export default function GeoMapWidget({ data, size = "md" }: Props) {
  const [mode, setMode] = useState<Mode>("WORLD");
  const [view, setView] = useState<View>("grid");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalPlayers, setModalPlayers] = useState<Jogador[]>([]);

  // ✅ dimension tracking
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

  // ✅ cache: busca lista completa 1x
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

  const byCountry = data?.counts?.byCountry ?? {};
  const byUf = data?.counts?.byStateBR ?? {};
  const playersByCountry = data?.players?.byCountry ?? {};
  const playersByUf = data?.players?.byStateBR ?? {};

  const isWorldOrContinent = mode !== "BR";
  const geoJson = isWorldOrContinent ? (worldGeo as any) : (brGeo as any);
  const targetCont = modeToContinent(mode);

  // ✅ sets p/ checagem O(1)
  const countriesWithPlayers = useMemo(() => {
    const s = new Set<string>();
    for (const [k, v] of Object.entries(byCountry)) {
      if ((v ?? 0) > 0) s.add(String(k).toUpperCase());
    }
    return s;
  }, [byCountry]);

  const ufsWithPlayers = useMemo(() => {
    const s = new Set<string>();
    for (const [k, v] of Object.entries(byUf)) {
      if ((v ?? 0) > 0) s.add(String(k).toUpperCase());
    }
    return s;
  }, [byUf]);

  /**
   * ✅ PROJEÇÃO (mantida igual)
   */
  const projection = useMemo((): GeoProjection | null => {
    if (!ready) return null;

    const width = box.w;
    const height = box.h;

    if (
      mode === "WORLD" ||
      mode === "CONTINENT_EUROPE" ||
      mode === "CONTINENT_SOUTH_AMERICA"
    ) {
      const proj = geoEqualEarth();

      const fc = worldGeo as any;
      let featureCollection: any = fc;

      if (targetCont) {
        const filtered = {
          type: "FeatureCollection",
          features: (fc?.features ?? []).filter(
            (g: any) => continentFromGeo(g) === targetCont,
          ),
        };
        if (filtered.features.length > 0) featureCollection = filtered;
      }

      const pad = Math.round(Math.min(width, height) * 0.05);
      const fitW = Math.max(10, width - pad * 2);
      const fitH = Math.max(10, height - pad * 2);

      proj.fitSize([fitW, fitH], featureCollection);

      const t = (proj as any).translate?.() as [number, number] | undefined;
      if (t && Array.isArray(t)) {
        (proj as any).translate([t[0] + pad, t[1] + pad]);
      }

      return proj;
    }

    if (mode === "BR") {
      const proj = geoMercator();

      const fc = brGeo as any;

      const pad = Math.round(Math.min(width, height) * 0.06);
      const fitW = Math.max(10, width - pad * 2);
      const fitH = Math.max(10, height - pad * 2);

      proj.fitSize([fitW, fitH], fc);

      const t = (proj as any).translate?.() as [number, number] | undefined;
      if (t && Array.isArray(t)) {
        (proj as any).translate([t[0] + pad, t[1] + pad]);
      }

      return proj;
    }

    return null;
  }, [mode, ready, box.w, box.h, targetCont]);

  async function openPlayers(title: string, rawList: any[]) {
    const raw = Array.isArray(rawList) ? rawList : [];
    const needsEnrich = raw.some((p) => !looksLikeFullJogador(p));
    if (needsEnrich) await ensureFullIndex();

    const idx = fullByIdRef.current ?? new Map<string, Jogador>();
    const final = raw.map((p) => {
      const id = String(p?.id ?? "");
      const full = id ? idx.get(id) : undefined;
      return normalizeJogadorAny(full ?? p);
    });

    setModalTitle(title);
    setModalPlayers(final);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalPlayers([]);
    setModalTitle("");
  }

  /**
   * ✅ Tooltip ultra-leve (corrigido):
   * - guarda posição mesmo antes do tooltip montar
   * - aplica posição no 1º frame após montar
   * - hide com micro-delay (reduz flicker)
   * - hover funciona em TODO geo (click só se tiver jogador)
   */
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

  // ✅ fecha tooltip automaticamente quando abre modal
  useEffect(() => {
    if (modalOpen) {
      setTipMeta((prev) => (prev.show ? { ...prev, show: false } : prev));
    }
  }, [modalOpen]);

  function setTipPosition(clientX: number, clientY: number) {
    const el = tipElRef.current;
    const boxEl = boxRef.current; // ✅ usa o container do mapa
    if (!el || !boxEl) return;

    const rect = boxEl.getBoundingClientRect();

    const offset = 14;
    let x = Math.round(clientX - rect.left + offset);
    let y = Math.round(clientY - rect.top + offset);

    // ✅ clamp pra não sair do card
    const pad = 10;
    const maxX = rect.width - el.offsetWidth - pad;
    const maxY = rect.height - el.offsetHeight - pad;

    x = Math.max(pad, Math.min(x, maxX));
    y = Math.max(pad, Math.min(y, maxY));

    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function showTip(e: React.MouseEvent, next: Omit<TipMeta, "show">) {
    // cancela hide pendente (evita flicker)
    if (hideTRef.current) {
      window.clearTimeout(hideTRef.current);
      hideTRef.current = null;
    }

    pendingPosRef.current = { x: e.clientX, y: e.clientY };

    setTipMeta({
      show: true,
      title: next.title,
      subtitle: next.subtitle,
      hint: next.hint,
    });
  }

  // aplica posição quando tooltip montar
  useEffect(() => {
    if (!tipMeta.show) return;
    const p = pendingPosRef.current;
    if (!p) return;
    const id = requestAnimationFrame(() => setTipPosition(p.x, p.y));
    return () => cancelAnimationFrame(id);
  }, [tipMeta.show]);

  function moveTip(e: React.MouseEvent) {
    if (!tipMeta.show) return;

    pendingPosRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pendingPosRef.current;
      if (!p) return;
      setTipPosition(p.x, p.y);
    });
  }

  function hideTip() {
    if (hideTRef.current) window.clearTimeout(hideTRef.current);
    hideTRef.current = window.setTimeout(() => {
      setTipMeta((prev) => (prev.show ? { ...prev, show: false } : prev));
      hideTRef.current = null;
    }, 40);
  }

  function back() {
    hideTip();
    if (mode === "BR") {
      setMode("CONTINENT_SOUTH_AMERICA");
      return;
    }
    if (mode === "CONTINENT_EUROPE" || mode === "CONTINENT_SOUTH_AMERICA") {
      setMode("WORLD");
      return;
    }
  }

  // ✅ caches (reduz custo por render)
  const contCacheRef = useRef<Map<string, Continent>>(new Map());
  const isoCacheRef = useRef<Map<string, string>>(new Map());
  const ufCacheRef = useRef<Map<string, string>>(new Map());
  const nameCacheRef = useRef<Map<string, string>>(new Map());

  const getContCached = (geo: any, idx: number) => {
    const k = geoKey(geo, idx);
    const m = contCacheRef.current;
    const hit = m.get(k);
    if (hit) return hit;
    const c = continentFromGeo(geo);
    m.set(k, c);
    return c;
  };

  const getIsoCached = (geo: any, idx: number) => {
    const k = geoKey(geo, idx);
    const m = isoCacheRef.current;
    const hit = m.get(k);
    if (hit !== undefined) return hit;
    const iso = getISO2FromWorldGeo(geo);
    m.set(k, iso);
    return iso;
  };

  const getUfCached = (geo: any, idx: number) => {
    const k = geoKey(geo, idx);
    const m = ufCacheRef.current;
    const hit = m.get(k);
    if (hit !== undefined) return hit;
    const uf = getUfFromBrGeo(geo);
    m.set(k, uf);
    return uf;
  };

  const getNameCached = (geo: any, idx: number, kind: "country" | "state") => {
    const k = `${kind}:${geoKey(geo, idx)}`;
    const m = nameCacheRef.current;
    const hit = m.get(k);
    if (hit !== undefined) return hit;
    const nm = kind === "country" ? getCountryName(geo) : getStateName(geo);
    m.set(k, nm);
    return nm;
  };

  return (
    <>
      <HoverTooltip meta={tipMeta} elRef={tipElRef} />

      <div className="relative h-full w-full">
        {/* Top bar */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Mapa</div>
            <div className="mt-1 text-xs text-gray-500">
              {mode === "WORLD" && "Mundo"}
              {mode === "CONTINENT_EUROPE" && "Europa"}
              {mode === "CONTINENT_SOUTH_AMERICA" && "América do Sul"}
              {mode === "BR" && "Brasil"}
            </div>
          </div>

          {mode !== "WORLD" && (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          )}
        </div>

        <div
          ref={boxRef}
          className="relative h-[calc(100%-44px)] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white"
        >
          {!ready || !projection ? null : (
            <ComposableMap
              key={`${mode}-${box.w}-${box.h}`}
              width={box.w}
              height={box.h}
              projection={projection as any}
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              <Geographies geography={geoJson}>
                {({ geographies }: any) => {
                  const list =
                    isWorldOrContinent && targetCont
                      ? geographies.filter(
                          (g: any, i: number) =>
                            getContCached(g, i) === targetCont,
                        )
                      : geographies;

                  return list.map((geo: any, idx: number) => {
                    const key = geoKey(geo, idx);

                    // -------------------------
                    // WORLD / CONTINENT
                    // -------------------------
                    if (isWorldOrContinent) {
                      const iso2 = getIsoCached(geo, idx);
                      const count = iso2 ? (byCountry[iso2] ?? 0) : 0;
                      const clickable =
                        !!iso2 && countriesWithPlayers.has(iso2);

                      const countryName =
                        getNameCached(geo, idx, "country") || iso2 || "—";

                      const subtitle = `${count} jogador${
                        count === 1 ? "" : "es"
                      }`;
                      const hint = clickable
                        ? "Clique para ver jogadores"
                        : "Sem jogadores";

                      const handlers = {
                        onMouseEnter: (e: React.MouseEvent) => {
                          showTip(e, { title: countryName, subtitle, hint });
                        },
                        onMouseMove: moveTip,
                        onMouseLeave: hideTip,
                        onClick: () => {
                          hideTip(); // ✅ some imediatamente ao clicar
                          if (!clickable) return;

                          if (mode === "WORLD") {
                            const cont = getContCached(geo, idx);
                            if (cont === "EUROPE") {
                              setMode("CONTINENT_EUROPE");
                              return;
                            }
                            if (cont === "SOUTH_AMERICA") {
                              setMode("CONTINENT_SOUTH_AMERICA");
                              return;
                            }
                            return;
                          }

                          if (iso2 === "BR") {
                            setMode("BR");
                            return;
                          }

                          openPlayers(
                            `País: ${iso2}`,
                            playersByCountry[iso2] ?? [],
                          );
                        },
                      };

                      return (
                        <Geography
                          key={key}
                          geography={geo}
                          {...(handlers as any)}
                          style={{
                            default: {
                              fill: clickable ? "#F2CD00" : "#e2e8f0",
                              outline: "none",
                              cursor: clickable ? "pointer" : "default",
                            },
                            hover: {
                              fill: clickable ? "#F2CD00" : "#e2e8f0",
                              outline: "none",
                              cursor: clickable ? "pointer" : "default",
                            },
                            pressed: {
                              fill: clickable ? "#F2CD00" : "#e2e8f0",
                              outline: "none",
                            },
                          }}
                        />
                      );
                    }

                    // -------------------------
                    // BR (UF)
                    // -------------------------
                    const uf = getUfCached(geo, idx);
                    const count = uf ? (byUf[uf] ?? 0) : 0;
                    const clickable = !!uf && ufsWithPlayers.has(uf);

                    const stateName =
                      getNameCached(geo, idx, "state") || uf || "—";
                    const title = uf ? `${stateName} (${uf})` : stateName;

                    const subtitle = `${count} jogador${
                      count === 1 ? "" : "es"
                    }`;
                    const hint = clickable
                      ? "Clique para ver jogadores"
                      : "Sem jogadores";

                    const handlers = {
                      onMouseEnter: (e: React.MouseEvent) => {
                        showTip(e, { title, subtitle, hint });
                      },
                      onMouseMove: moveTip,
                      onMouseLeave: hideTip,
                      onClick: () => {
                        hideTip(); // ✅ some imediatamente ao clicar
                        if (!clickable) return;
                        openPlayers(`UF: ${uf}`, playersByUf[uf] ?? []);
                      },
                    };

                    return (
                      <Geography
                        key={key}
                        geography={geo}
                        {...(handlers as any)}
                        style={{
                          default: {
                            fill: clickable ? "#F2CD00" : "#e2e8f0",
                            stroke: "#ffffff",
                            strokeWidth: 0.6,
                            outline: "none",
                            cursor: clickable ? "pointer" : "default",
                          },
                          hover: {
                            fill: clickable ? "#F2CD00" : "#e2e8f0",
                            outline: "none",
                            cursor: clickable ? "pointer" : "default",
                          },
                          pressed: {
                            fill: clickable ? "#F2CD00" : "#e2e8f0",
                            outline: "none",
                          },
                        }}
                      />
                    );
                  });
                }}
              </Geographies>
            </ComposableMap>
          )}
        </div>
      </div>

      <PlayersModal
        open={modalOpen}
        title={modalTitle}
        players={modalPlayers}
        view={view}
        onView={setView}
        onClose={closeModal}
      />
    </>
  );
}
