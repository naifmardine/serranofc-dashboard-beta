// lib/mapPlayerToJogador.ts
import type { Jogador } from "@/type/jogador";
import type { Player } from "@prisma/client";

type ClubLite =
  | {
      id: string;
      nome: string;
      logoUrl?: string | null;
    }
  | null
  | undefined;

function toIso(d: any) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

export function mapPlayerToJogador(p: Player, club?: ClubLite): Jogador {
  return {
    id: p.id,
    nome: p.nome,
    idade: p.idade,

    // ✅ clube vindo por lookup
    clubeId: p.clubeId ?? null,
    clubeNome: club?.nome ?? null,
    clubeRef: club
      ? { id: club.id, nome: club.nome, logoUrl: club.logoUrl ?? null }
      : null,

    posicao: p.posicao as Jogador["posicao"],
    valorMercado: p.valorMercado,
    peDominante: (p.peDominante === "E" ? "E" : "D") as Jogador["peDominante"],

    representacao: (p as any).representacao ?? null,
    numeroCamisa: (p as any).numeroCamisa ?? null,

    imagemUrl: (p as any).imagemUrl ?? null,
    altura: (p as any).altura ?? null,
    situacao: (p as any).situacao ?? null,
    possePct: (p as any).possePct ?? null,

    createdAt: toIso((p as any).createdAt) ?? undefined,
    updatedAt: toIso((p as any).updatedAt) ?? undefined,

    // ========= DETALHE =========
    anoNascimento: (p as any).anoNascimento ?? null,
    cidade: (p as any).cidade ?? null,
    nacionalidade: (p as any).nacionalidade ?? null,

    dataTransferencia: toIso((p as any).dataTransferencia),

    parceria: (p as any).parceria ?? null,
    empresario: (p as any).empresario ?? null,

    percPrimeiraOpcao: (p as any).percPrimeiraOpcao ?? null,
    valorPrimeiraOpcao: (p as any).valorPrimeiraOpcao ?? null,
    prazoPrimeiraOpcao: (p as any).prazoPrimeiraOpcao ?? null,

    percSegundaOpcao: (p as any).percSegundaOpcao ?? null,
    valorSegundaOpcao: (p as any).valorSegundaOpcao ?? null,
    prazoSegundaOpcao: (p as any).prazoSegundaOpcao ?? null,

    observacoes: (p as any).observacoes ?? null,
    qtdTransfRef: (p as any).qtdTransfRef ?? null,
    idadeTransfRef: (p as any).idadeTransfRef ?? null,
    valorTransfRef: (p as any).valorTransfRef ?? null,
    direitosSerrano: (p as any).direitosSerrano ?? null,
    tempoAteIdadeVenda: (p as any).tempoAteIdadeVenda ?? null,
    racionalProspecao: (p as any).racionalProspecao ?? null,
    valorProsp: (p as any).valorProsp ?? null,
    comissao: (p as any).comissao ?? null,

    instagramHandle: (p as any).instagramHandle ?? null,
    instagramPosts: ((p as any).instagramPosts as any) ?? null,

    xUrl: (p as any).xUrl ?? null,
    youtubeUrl: (p as any).youtubeUrl ?? null,
    videoUrl: (p as any).videoUrl ?? null,

    passaporte: ((p as any).passaporte as any) ?? null,
    selecao: ((p as any).selecao as any) ?? null,
    statsPorTemporada: ((p as any).statsPorTemporada as any) ?? null,
  };
}
