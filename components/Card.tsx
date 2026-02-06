import type { Jogador } from "../type/jogador";
import Link from "next/link";

const FALLBACK_DOM =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="%23F2CD00"/></svg>';
const FALLBACK_SEC =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="%23000000"/></svg>';

const getFootSrc = (
  n: "direito" | "direito_dominante" | "esquerdo" | "esquerdo_dominante",
) => `/assets/pe/${n}.svg`;

const fmtEUR = (mi: number) =>
  "€ " +
  mi.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) +
  "M";

function PosicaoLabel({ p }: { p: Jogador["posicao"] }) {
  const map: Record<Jogador["posicao"], string> = {
    GOL: "Goleiro",
    LD: "Lateral Direito",
    ZAG: "Zagueiro",
    LE: "Lateral Esquerdo",
    VOL: "Volante",
    MC: "Meio-Campo",
    MEI: "Meia",
    PD: "Ponta Direita",
    PE: "Ponta Esquerda",
    ATA: "Atacante",
  };
  return <>{map[p]}</>;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (
    <span className="font-extrabold text-[#003399] text-[28px]">
      {`${a}${b}`.toUpperCase()}
    </span>
  );
}

type Props = { player: Jogador; onClick?: (id: string) => void };

export default function Card({ player, onClick }: Props) {
  // ✅ regra do valor
  const temValor = Number(player.valorMercado) > 0;

  // ✅ posse sempre vem dela (se existir), independente do valor
  const hasPosse = typeof player.possePct === "number" && Number.isFinite(player.possePct);
  const possePct = hasPosse ? (player.possePct as number) : 0;

  // ✅ fill sempre condizente com % serrano (quando tiver)
  const widthPct = hasPosse ? Math.max(0, Math.min(100, possePct)) : 0;

  // ✅ label sempre aparece; se não tiver posse, vira —
  const posseLabel = hasPosse ? `${possePct.toFixed(1).replace(".", ",")}%` : "—";

  const representacao =
    (player as any).representacao ?? (player as any)["representação"] ?? "";

  const isDomDireito = player.peDominante === "D";
  const leftFootSrc = isDomDireito
    ? getFootSrc("esquerdo") || FALLBACK_SEC
    : getFootSrc("esquerdo_dominante") || FALLBACK_DOM;
  const rightFootSrc = isDomDireito
    ? getFootSrc("direito_dominante") || FALLBACK_DOM
    : getFootSrc("direito") || FALLBACK_SEC;

  // ✅ cores dependem SOMENTE do valor (verde) vs sem valor (cinza)
  const trackClass = temValor ? "bg-green-100" : "bg-gray-100";
  const fillClass = temValor ? "bg-green-500" : "bg-gray-400";
  const pctTextClass = temValor ? "text-green-600" : "text-gray-400";
  const valueTextClass = "text-green-700"; // só aparece quando temValor

  return (
    <Link
      href={`/jogadores/${player.id}`}
      className="block text-inherit no-underline group"
      aria-label={`Ver detalhes de ${player.nome}`}
      onClick={() => onClick?.(player.id)}
    >
      <article
        className="bg-white border border-gray-200 rounded-2xl px-[18px] py-5 min-h-80 
                   flex flex-col gap-3 transition-all duration-150 ease-in-out
                   hover:shadow-[0_16px_38px_rgba(0,0,0,0.08)] hover:border-[#d5d9e5] hover:scale-105
                   active:translate-y-px
                   group-focus-visible:outline group-focus-visible:outline-[#F2CD00] group-focus-visible:outline-offset-2 group-focus-visible:rounded-[14px]"
        role="article"
      >
        {/* Avatar */}
        <div
          className="w-28 h-28 my-1 mb-1.5 mx-auto rounded-full overflow-hidden 
                     grid place-items-center bg-linear-to-br from-[#eef2ff] to-white border border-[#dfe3f0]"
        >
          {player.imagemUrl ? (
            <img
              src={player.imagemUrl}
              alt={player.nome}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Initials name={player.nome} />
          )}
        </div>

        {/* Nome + pés */}
        <div className="flex items-center justify-between gap-3">
          <h3
            className="m-0 text-xl font-extrabold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis flex-auto min-w-0"
            title={player.nome}
          >
            {player.nome}
          </h3>
          <div
            className="inline-flex items-center gap-0.5 flex-none"
            title={`Pé dominante: ${player.peDominante}`}
          >
            <img
              src={leftFootSrc}
              className={`block w-4 h-4 opacity-90 scale-[.92] ${
                isDomDireito ? "" : "w-[22px] h-[22px] scale-105 opacity-100"
              }`}
              alt=""
              aria-hidden
            />
            <img
              src={rightFootSrc}
              className={`block w-[22px] h-[22px] scale-105 ${
                isDomDireito ? "" : "w-4 h-4 opacity-90 scale-[.92]"
              }`}
              alt=""
              aria-hidden
            />
          </div>
        </div>

        {/* Posição */}
        <div className="flex justify-center">
          <span className="font-bold text-[#222a3a] text-sm">
            <PosicaoLabel p={player.posicao} />
          </span>
        </div>

        {/* Idade / Valor */}
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-[13px]">Idade: {player.idade}</span>

          {/* ✅ valor some se for 0 */}
          {temValor ? (
            <span
              className={`inline-flex items-baseline gap-1.5 font-extrabold text-sm leading-none whitespace-nowrap ${valueTextClass}`}
            >
              {fmtEUR(player.valorMercado)}
            </span>
          ) : (
            <span className="text-[13px] text-transparent select-none">.</span>
          )}
        </div>

        {/* Barra de Posse Serrano (sempre condizente com % serrano) */}
        <div className="flex items-center justify-center gap-2.5">
          <div
            className={`relative w-[89%] max-xl:w-[78%] h-3 rounded-full ${trackClass} overflow-hidden`}
            aria-hidden
          >
            {/* ✅ fill sempre segue a % (se tiver posse). Se não tiver posse, width=0 e não aparece */}
            {hasPosse && (
              <span
                className={`absolute inset-0 right-auto ${fillClass} rounded-full`}
                style={{ width: `${widthPct}%` }}
              />
            )}
          </div>

          {/* ✅ % sempre aparece (verde quando tem valor, cinza quando não tem) */}
          <span className={`font-extrabold text-[12.5px] tracking-[.2px] ${pctTextClass}`}>
            {posseLabel}
          </span>
        </div>

        {/* Clube / Agente */}
        <div className="mt-auto flex items-center justify-between gap-3.5">
          <span
            className="
              bg-gray-100 text-gray-900 font-semibold border border-gray-200
              px-3 py-1.5 rounded-[10px] text-[12.5px]
              max-w-[140px] truncate whitespace-nowrap overflow-hidden
            "
            title={player.clubeNome ?? ""}
          >
            {player.clubeNome ?? "—"}
          </span>

          {representacao && (
            <span className="text-[#5f6b84] text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[60%]">
              {representacao}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}
