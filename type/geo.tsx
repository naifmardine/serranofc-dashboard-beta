export type PlayerMini = {
  id: string;
  nome: string;
  posicao: string | null;
  imagemUrl: string | null;
  clube: { id: string; nome: string; logoUrl: string | null } | null;
};

export type PlayersGeoResponse = {
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
