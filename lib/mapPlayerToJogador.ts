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

function onlyDigits(v: any) {
  return String(v ?? "").replace(/\D/g, "");
}

function normalizeCPF(v: any) {
  return onlyDigits(v).slice(0, 11); // guarda só dígitos; formata só na UI
}

function calcAgeFromYear(year?: number | null) {
  if (!year || !Number.isFinite(year)) return null;
  const now = new Date();
  const age = now.getFullYear() - year;
  return age < 0 ? 0 : age;
}

export function mapPlayerToJogador(p: Player, club?: ClubLite): Jogador {
  const anoNascimentoRaw = (p as any).anoNascimento;
  const anoNascimento =
    typeof anoNascimentoRaw === "number" && Number.isFinite(anoNascimentoRaw)
      ? Math.trunc(anoNascimentoRaw)
      : null;

  const idadeFromDb =
    typeof (p as any).idade === "number" && Number.isFinite((p as any).idade)
      ? (p as any).idade
      : null;

  const idadeCalc = calcAgeFromYear(anoNascimento);
  const idadeFinal = idadeFromDb ?? idadeCalc ?? 0;

  const cpfDigits = normalizeCPF((p as any).cpf);
  const cpfFinal = cpfDigits || ""; // mantém compat com type atual (string)

  return {
    id: p.id,
    nome: p.nome,

    // ✅ normaliza pra sempre casar com o type atual (string/number)
    cpf: cpfFinal,
    idade: idadeFinal,

    // clube vindo por lookup
    clubeId: p.clubeId ?? null,
    clubeNome: club?.nome ?? null,
    clubeRef: club ? { id: club.id, nome: club.nome, logoUrl: club.logoUrl ?? null } : null,

    posicao: p.posicao as Jogador["posicao"],
    valorMercado: (p as any).valorMercado ?? 0,
    peDominante: ((p as any).peDominante === "E" ? "E" : "D") as Jogador["peDominante"],

    representacao: (p as any).representacao ?? null,
    numeroCamisa: (p as any).numeroCamisa ?? null,

    imagemUrl: (p as any).imagemUrl ?? null,
    altura: (p as any).altura ?? null,
    situacao: (p as any).situacao ?? null,
    contratoInicio: toIso((p as any).contratoInicio),
    contratoFim: toIso((p as any).contratoFim),
    possePct: (p as any).possePct ?? null,

    createdAt: toIso((p as any).createdAt) ?? undefined,
    updatedAt: toIso((p as any).updatedAt) ?? undefined,

    // detalhe
    anoNascimento,
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