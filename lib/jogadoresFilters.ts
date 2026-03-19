import type { Jogador } from "@/type/jogador";
import type { JogadoresFilters } from "@/components/Atoms/filter/utils";

export function applyJogadoresFilters(players: Jogador[], f: JogadoresFilters) {
  const ageMode = f.ageMode ?? "idade";

  return players.filter((p: any) => {
    // Clube
    if (f.clubes?.length) {
      const clubeNome = (p.clubeNome ?? p.clubeRef?.nome ?? p.clube ?? "—").trim();
      if (!f.clubes.includes(clubeNome)) return false;
    }

    // Agência
    if (f.agencias?.length) {
      const rep = String(p.representacao ?? "").trim();
      const wantsNone = f.agencias.includes("__NONE_AGENCY__");
      const chosen = f.agencias.filter((x) => x !== "__NONE_AGENCY__");

      if (wantsNone && chosen.length === 0) {
        // somente sem agência
        if (rep) return false;
      } else if (wantsNone && chosen.length > 0) {
                     // sem agência OU uma das escolhidas
                     if (rep && !chosen.includes(rep)) return false;
                   }
             else if (!rep || !chosen.includes(rep)) return false;
    }

    // Posição
    if (f.posicoes?.length) {
      if (!f.posicoes.includes(p.posicao)) return false;
    }

    // Pé dominante
    if (f.peDominante?.length) {
      if (!f.peDominante.includes(p.peDominante)) return false;
    }

    // Idade vs Ano Nasc.
    if (ageMode === "idade") {
      const idade = Number(p.idade);
      if (Number.isFinite(f.idadeMin as any) && idade < (f.idadeMin as number)) return false;
      if (Number.isFinite(f.idadeMax as any) && idade > (f.idadeMax as number)) return false;
    } else {
      const ano = Number(p.anoNascimento);
      // decisão: se está filtrando por ano, e o jogador não tem ano => não entra
      if (!Number.isFinite(ano)) return false;

      if (Number.isFinite(f.anoNascimentoMin as any) && ano < (f.anoNascimentoMin as number)) return false;
      if (Number.isFinite(f.anoNascimentoMax as any) && ano > (f.anoNascimentoMax as number)) return false;
    }

    // Valor de mercado
    const valor = Number(p.valorMercado);

    if (f.valorSemDefinicao) {
      // só quem não tem valor / zero
      if (Number.isFinite(valor) && valor > 0) return false;
    } else {
      if (Number.isFinite(f.valorMin as any)) {
        if (!Number.isFinite(valor) || valor < (f.valorMin as number)) return false;
      }
      if (Number.isFinite(f.valorMax as any)) {
        if (!Number.isFinite(valor) || valor > (f.valorMax as number)) return false;
      }
    }

    return true;
  });
}
