// components/GeoMapWidget/MapCanvas.tsx
"use client";

import React from "react";
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import type { GeoProjection } from "d3-geo";

import type { ContinentCode, Mode } from "./geoAdapters";
import {
  MAP_DATA,
  getContinentCodeFromGeo,
  getISO2FromCountryGeo,
  getCountryLabel,
  getStateLabel,
  getUFfromBRGeo,
  safeStr,
} from "./geoAdapters";

type Props = {
  mode: Mode;
  box: { w: number; h: number };
  projection: GeoProjection;

  byCountry: Record<string, number>;
  byUF: Record<string, number>;
  countriesWithPlayers: Set<string>;
  continentsWithPlayers: Set<ContinentCode>;
  ufsWithPlayers: Set<string>;

  nameToISO2: Map<string, string>;

  onHover: (
    e: React.MouseEvent,
    meta: { title: string; subtitle: string; hint: string },
  ) => void;
  onMove: (e: React.MouseEvent) => void;
  onLeave: () => void;

  onSelectContinent: (c: ContinentCode) => void;
  onSelectCountry: (iso2: string, label: string) => void;
  onSelectUF: (uf: string, label: string) => void;
};

function geoKey(geo: any, idx: number) {
  const id = safeStr(geo?.id);
  const p = geo?.properties ?? {};
  const name = safeStr(
    p.name ?? p.NAME ?? p.geounit ?? p.ADMIN ?? p.admin ?? p.continent ?? "",
  );
  return `geo-${idx}-${id || "x"}-${name || "y"}`;
}

function normalizeContinentCode(x: unknown): ContinentCode | null {
  const v = safeStr(x).toUpperCase();
  if (v === "SA" || v === "NA" || v === "EU" || v === "AF" || v === "AS" || v === "OC") {
    return v as ContinentCode;
  }
  return null;
}

function continentLabelPT(code: ContinentCode) {
  switch (code) {
    case "SA":
      return "América do Sul";
    case "NA":
      return "América do Norte";
    case "EU":
      return "Europa";
    case "AF":
      return "África";
    case "AS":
      return "Ásia";
    case "OC":
      return "Oceania";
  }
}

function pickContinentLabel(_geo: any, cont: ContinentCode | null) {
  if (cont) return continentLabelPT(cont);
  return "Continente";
}

export default function MapCanvas(props: Props) {
  const {
    mode,
    box,
    projection,
    byCountry,
    byUF,
    countriesWithPlayers,
    continentsWithPlayers,
    ufsWithPlayers,
    nameToISO2,
    onHover,
    onMove,
    onLeave,
    onSelectContinent,
    onSelectCountry,
    onSelectUF,
  } = props;

  const geoData = MAP_DATA[mode];

  if (!geoData) {
    return (
      <div className="grid h-full w-full place-items-center text-sm text-gray-500">
        Mapa indisponível para o modo:{" "}
        <span className="font-semibold">{String(mode)}</span>
      </div>
    );
  }

  const isWorld = mode === "WORLD";
  const isBR = mode === "BR";
  const isContinent = !isWorld && !isBR;

  return (
    <ComposableMap
      key={`${mode}-${box.w}-${box.h}`}
      width={box.w}
      height={box.h}
      projection={projection as any}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* PASSA O JSON, não URL */}
      <Geographies geography={geoData as any}>
        {({ geographies }: any) => {
          const list = Array.isArray(geographies) ? geographies : [];

          return list.map((geo: any, idx: number) => {
            const key = geoKey(geo, idx);

            // -------------------------
            // WORLD: continentes
            // -------------------------
            if (isWorld) {
              const contRaw = getContinentCodeFromGeo(geo);
              const cont = normalizeContinentCode(contRaw);

              const hasPlayers = !!cont && continentsWithPlayers.has(cont);
              const clickable = hasPlayers;

              const title = pickContinentLabel(geo, cont);
              const subtitle = hasPlayers ? "Clique para abrir" : "Sem jogadores";
              const hint = hasPlayers ? "Abrir países" : "Indisponível";

              return (
                <Geography
                  key={key}
                  geography={geo}
                  onMouseEnter={(e) => onHover(e, { title, subtitle, hint })}
                  onMouseMove={onMove}
                  onMouseLeave={onLeave}
                  onClick={() => {
                    onLeave();
                    if (!cont) return;
                    if (!hasPlayers) return;
                    onSelectContinent(cont);
                  }}
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
            // CONTINENTE: países
            // -------------------------
            if (isContinent) {
              const iso2 = getISO2FromCountryGeo(geo, nameToISO2);
              const label = getCountryLabel(geo, nameToISO2) || iso2 || "—";

              const count = iso2 ? (byCountry[iso2] ?? 0) : 0;
              const clickable = !!iso2 && countriesWithPlayers.has(iso2);

              const subtitle = `${count} jogador${count === 1 ? "" : "es"}`;
              const hint = clickable ? "Clique para ver jogadores" : "Sem jogadores";

              return (
                <Geography
                  key={key}
                  geography={geo}
                  onMouseEnter={(e) => onHover(e, { title: label, subtitle, hint })}
                  onMouseMove={onMove}
                  onMouseLeave={onLeave}
                  onClick={() => {
                    onLeave();
                    if (!clickable) return;
                    onSelectCountry(iso2, label);
                  }}
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
            // BR: estados
            // -------------------------
            const uf = getUFfromBRGeo(geo);
            const label = getStateLabel(geo) || uf || "—";

            const count = uf ? (byUF[uf] ?? 0) : 0;
            const clickable = !!uf && ufsWithPlayers.has(uf);

            const subtitle = `${count} jogador${count === 1 ? "" : "es"}`;
            const hint = clickable ? "Clique para ver jogadores" : "Sem jogadores";

            return (
              <Geography
                key={key}
                geography={geo}
                onMouseEnter={(e) =>
                  onHover(e, {
                    title: uf ? `${label} (${uf})` : label,
                    subtitle,
                    hint,
                  })
                }
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                onClick={() => {
                  onLeave();
                  if (!clickable) return;
                  onSelectUF(uf, label);
                }}
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
  );
}