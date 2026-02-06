import { prisma } from "@/lib/prisma";

type PlayerMini = {
  id: string;
  nome: string;
  posicao: string | null;
  imagemUrl: string | null;
  clube: { id: string; nome: string; logoUrl: string | null } | null;
};

export type GeoMapData = {
  counts: {
    byCountry: Record<string, number>;
    byStateBR: Record<string, number>;
    missing: number;
  };
  players: {
    byCountry: Record<string, PlayerMini[]>;
    byStateBR: Record<string, PlayerMini[]>;
  };
};

export async function buildGeoMapData(): Promise<GeoMapData> {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      nome: true,
      posicao: true,
      imagemUrl: true,
      clube: {
        select: {
          id: true,
          nome: true,
          logoUrl: true,
          countryCode: true,
          stateCode: true,
        },
      },
    },
  });

  const byCountryCount: Record<string, number> = {};
  const byStateBRCount: Record<string, number> = {};
  const byCountryPlayers: Record<string, PlayerMini[]> = {};
  const byStateBRPlayers: Record<string, PlayerMini[]> = {};
  let missing = 0;

  for (const p of players) {
    const club = p.clube;
    if (!club?.countryCode) {
      missing += 1;
      continue;
    }

    const cc = String(club.countryCode).toUpperCase();

    const mini: PlayerMini = {
      id: p.id,
      nome: p.nome,
      posicao: p.posicao ?? null,
      imagemUrl: p.imagemUrl ?? null,
      clube: club ? { id: club.id, nome: club.nome, logoUrl: club.logoUrl ?? null } : null,
    };

    byCountryCount[cc] = (byCountryCount[cc] ?? 0) + 1;
    (byCountryPlayers[cc] ??= []).push(mini);

    if (cc === "BR") {
      const uf = (club.stateCode ? String(club.stateCode).toUpperCase() : "") || "—";
      byStateBRCount[uf] = (byStateBRCount[uf] ?? 0) + 1;
      (byStateBRPlayers[uf] ??= []).push(mini);
    }
  }

  return {
    counts: { byCountry: byCountryCount, byStateBR: byStateBRCount, missing },
    players: { byCountry: byCountryPlayers, byStateBR: byStateBRPlayers },
  };
}
