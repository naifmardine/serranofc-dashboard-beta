"use client";

import { useMemo } from "react";
import { geoEqualEarth, geoMercator, type GeoProjection } from "d3-geo";
import { feature as topoFeature } from "topojson-client";
import type { Mode } from "./geoAdapters";

function isTopoTopology(x: any): x is { type: "Topology"; objects: Record<string, any> } {
  return !!x && typeof x === "object" && x.type === "Topology" && x.objects && typeof x.objects === "object";
}

function isGeoFeatureCollection(x: any): boolean {
  return !!x && typeof x === "object" && x.type === "FeatureCollection" && Array.isArray(x.features);
}

function isGeoFeature(x: any): boolean {
  return !!x && typeof x === "object" && x.type === "Feature" && x.geometry;
}

/**
 * Converte entrada (TopoJSON/GeoJSON) em algo que d3-geo fitSize entende.
 * - Se já for GeoJSON FeatureCollection/Feature: retorna como está.
 * - Se for Topology: converte o primeiro objeto em FeatureCollection.
 */
function toFitGeo(input: any): any | null {
  if (!input) return null;

  if (isGeoFeatureCollection(input) || isGeoFeature(input)) return input;

  if (isTopoTopology(input)) {
    const keys = Object.keys(input.objects || {});
    const firstKey = keys[0];
    if (!firstKey) return null;

    try {
      // topojson-client feature() retorna Feature ou FeatureCollection
      const geo = topoFeature(input as any, input.objects[firstKey] as any);
      return geo ?? null;
    } catch {
      return null;
    }
  }

  // fallback: tenta usar do jeito que veio (mas pode falhar)
  return input;
}

export function useFitProjection(
  ready: boolean,
  mode: Mode,
  box: { w: number; h: number },
  mapData: any
): GeoProjection | null {
  return useMemo(() => {
    if (!ready) return null;

    const width = box.w;
    const height = box.h;

    const fitGeo = toFitGeo(mapData);
    if (!fitGeo) return null;

    // WORLD + CONTINENTES
    if (mode !== "BR") {
      const proj = geoEqualEarth();

      const pad = Math.round(Math.min(width, height) * 0.05);
      const fitW = Math.max(10, width - pad * 2);
      const fitH = Math.max(10, height - pad * 2);

      try {
        proj.fitSize([fitW, fitH], fitGeo);
      } catch {
        return null;
      }

      const t = (proj as any).translate?.() as [number, number] | undefined;
      if (t && Array.isArray(t)) {
        (proj as any).translate([t[0] + pad, t[1] + pad]);
      }
      return proj;
    }

    // BR
    const proj = geoMercator();

    const pad = Math.round(Math.min(width, height) * 0.06);
    const fitW = Math.max(10, width - pad * 2);
    const fitH = Math.max(10, height - pad * 2);

    try {
      proj.fitSize([fitW, fitH], fitGeo);
    } catch {
      return null;
    }

    const t = (proj as any).translate?.() as [number, number] | undefined;
    if (t && Array.isArray(t)) {
      (proj as any).translate([t[0] + pad, t[1] + pad]);
    }
    return proj;
  }, [ready, mode, box.w, box.h, mapData]);
}
