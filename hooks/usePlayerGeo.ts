"use client";

import { useEffect, useState } from "react";
import type { PlayersGeoResponse } from "@/type/geo";

export function usePlayersGeo() {
  const [data, setData] = useState<PlayersGeoResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/dashboard/players-geo", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PlayersGeoResponse;
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "erro");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { data, error, loading };
}
