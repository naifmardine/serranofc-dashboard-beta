"use client";

import { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { Jogador } from "@/type/jogador";

const FALLBACK_DOM =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="%23F2CD00"/></svg>';
const FALLBACK_SEC =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="%23000000"/></svg>';

const getFootSrc = (
  n: "direito" | "direito_dominante" | "esquerdo" | "esquerdo_dominante",
) => `/assets/pe/${n}.svg`;

function initials(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

const fmtEUR = (mi: number) =>
  `€ ${mi.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}M`;

function labelPosicao(p: Jogador["posicao"]): string {
  const map: Record<string, string> = {
    GOL: "Goleiro",
    LD: "Lateral Direito",
    LE: "Lateral Esquerdo",
    ZAG: "Zagueiro",
    VOL: "Volante",
    MC: "Meio-Campo",
    MEI: "Meia",
    PD: "Ponta Direita",
    PE: "Ponta Esquerda",
    ATA: "Atacante",
  };
  return map[p] ?? p;
}

const tdBaseClasses =
  "px-4 py-3 align-middle border-b border-gray-200 text-slate-900 whitespace-nowrap";

export default function PlayerRow({ player }: { player: Jogador }) {
  const router = useRouter();

  const isDomDireito = player.peDominante === "D";

  const leftFootSrc = isDomDireito
    ? getFootSrc("esquerdo") || FALLBACK_SEC
    : getFootSrc("esquerdo_dominante") || FALLBACK_DOM;

  const rightFootSrc = isDomDireito
    ? getFootSrc("direito_dominante") || FALLBACK_DOM
    : getFootSrc("direito") || FALLBACK_SEC;

  const go = () => router.push(`/jogadores/${player.id}`);

  const onKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };

  const situacao =
    player.situacao && String(player.situacao).trim() !== ""
      ? String(player.situacao)
      : "—";

  const possePct =
    typeof player.possePct === "number"
      ? player.possePct.toFixed(0) + "%"
      : "—";

  // ✅ altura funcionando
  const altura =
    typeof (player as any).altura === "number" &&
    Number.isFinite((player as any).altura)
      ? `${(player as any).altura} cm`
      : "—";

  // ✅ valor: se 0 -> —
  const temValor = Number(player.valorMercado) > 0;
  const valorTxt = temValor ? fmtEUR(player.valorMercado) : "—";

  return (
    <tr
      className="
        cursor-pointer
        transition-colors duration-150
        hover:bg-gray-50
        focus-visible:outline focus-visible:outline-[#F2CD00] focus-visible:-outline-offset-2
      "
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={onKey}
    >
      {/* Jogador */}
      <td className={tdBaseClasses}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#dfe3f0]
                       bg-linear-to-br from-[#eef2ff] to-white grid place-items-center"
          >
            {player.imagemUrl ? (
              <img
                src={player.imagemUrl}
                alt={player.nome}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-extrabold text-[#003399]">
                {initials(player.nome)}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div
              className="font-bold text-slate-900 truncate"
              title={player.nome}
            >
              {player.nome}
            </div>
            <div className="text-xs text-gray-500">
              {labelPosicao(player.posicao)}
            </div>
          </div>
        </div>
      </td>

      {/* Clube */}
      <td className={tdBaseClasses}>
        <span
          className="inline-block truncate max-w-40"
          title={player.clubeNome}
        >
          {player.clubeNome || "—"}
        </span>
      </td>

      {/* Idade */}
      <td className={tdBaseClasses}>{player.idade}</td>

      {/* Pé */}
      <td className={tdBaseClasses}>
        <div className="flex items-center gap-2.5 text-gray-900">
          <img
            src={leftFootSrc}
            alt=""
            aria-hidden
            className={isDomDireito ? "h-4 w-4" : "h-[22px] w-[22px]"}
            onError={(e) => (e.currentTarget.src = FALLBACK_SEC)}
          />
          <img
            src={rightFootSrc}
            alt=""
            aria-hidden
            className={isDomDireito ? "h-[22px] w-[22px]" : "h-4 w-4"}
            onError={(e) => (e.currentTarget.src = FALLBACK_DOM)}
          />
          <span className="ml-1 font-bold">{player.peDominante}</span>
        </div>
      </td>

      {/* Altura */}
      <td className={tdBaseClasses}>{altura}</td>

      {/* Situação */}
      <td className={tdBaseClasses}>
        <span className="truncate inline-block max-w-40" title={situacao}>
          {situacao}
        </span>
      </td>

      {/* Valor */}
      <td className={tdBaseClasses}>
        <span
          className={
            temValor
              ? "whitespace-nowrap font-extrabold text-green-600"
              : "text-slate-500"
          }
        >
          {valorTxt}
        </span>
      </td>

      {/* Posse */}
      <td className={tdBaseClasses}>{possePct}</td>
    </tr>
  );
}
