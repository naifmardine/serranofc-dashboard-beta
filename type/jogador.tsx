/* ===========================
   TIPOS BÁSICOS
=========================== */

export type Pe = "D" | "E";

export type Posicao =
  | "GOL"
  | "LD"
  | "ZAG"
  | "LE"
  | "VOL"
  | "MC"
  | "MEI"
  | "PD"
  | "PE"
  | "ATA";

/* ===========================
   JSON auxiliares
=========================== */

export type InstagramPost = {
  href: string;
  thumbUrl?: string;
};

export type Passaporte = {
  europeu: boolean;
  pais?: string;
};

export type Selecao = {
  convocado: boolean;
  anos?: number[];
  categoria?: string;
};

export type SeasonStats = {
  gols?: number;
  assistencias?: number;
  partidas?: number;
};

// Alias para ficar compatível com imports antigos
export type PlayerSeasonStats = SeasonStats;

/* ===========================
   TIPO PRINCIPAL — Jogador
=========================== */

export interface Jogador {
  id: string;
  nome: string;
  idade: number;
  clubeId?: string | null;
  clubeRef?: { id: string; nome: string; logoUrl?: string | null } | null;
  clubeNome?: string | null;
  posicao: Posicao;
  valorMercado: number;
  variacaoPct?: number | null;
  peDominante: Pe;

  representacao: string | null;
  numeroCamisa: number | null;

  imagemUrl?: string | null;

  altura?: number | null;
  situacao?: string | null;
  possePct?: number | null;

  createdAt?: string;
  updatedAt?: string;

  /* ========= CAMPOS DE DETALHE (agora incorporados AO Jogador) ========= */

  anoNascimento?: number | null;
  cidade?: string | null;
  nacionalidade?: string | null;

  dataTransferencia?: string | null;
  parceria?: string | null;
  empresario?: string | null;
  percPrimeiraOpcao?: number | null;
  valorPrimeiraOpcao?: number | null;
  prazoPrimeiraOpcao?: number | null;
  percSegundaOpcao?: number | null;
  valorSegundaOpcao?: number | null;
  prazoSegundaOpcao?: number | null;
  observacoes?: string | null;
  qtdTransfRef?: number | null;
  idadeTransfRef?: number | null;
  valorTransfRef?: number | null;
  direitosSerrano?: number | null;
  tempoAteIdadeVenda?: number | null;
  racionalProspecao?: string | null;
  valorProsp?: number | null;
  comissao?: number | null;

  instagramHandle?: string | null;
  instagramPosts?: InstagramPost[] | null;

  xUrl?: string | null;
  youtubeUrl?: string | null;
  videoUrl?: string | null;

  passaporte?: Passaporte | null;
  selecao?: Selecao | null;

  statsPorTemporada?: Record<string, SeasonStats> | null;
}

/* ====================================================
   EXTRA: Tipo PlayerDetail (não é outro objeto; é SÓ
   um alias para declarar campos extras opcionais.
   Tudo já existe dentro de Jogador.
==================================================== */

export type PlayerDetail = Partial<Jogador>;
