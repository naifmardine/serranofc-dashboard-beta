"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import type { Jogador, SeasonStats } from "@/type/jogador";
import { ChevronDown, Instagram } from "lucide-react";

/* ========================= CONSTANTES ========================= */

const PASSPORT_EU = "/assets/passaporte.svg";

const getFootSrc = (
  n: "direito" | "direito_dominante" | "esquerdo" | "esquerdo_dominante",
) => `/assets/pe/${n}.svg`;

/* ========================= HELPERS ========================= */

function initials(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

function labelDominante(pe?: Jogador["peDominante"] | null) {
  if (pe === "E") return "Esquerdo";
  if (pe === "D") return "Direito";
  return "Não informado";
}

function sumStats(all?: Record<string, SeasonStats> | null) {
  const base = { gols: 0, assistencias: 0, partidas: 0 };
  if (!all) return base;

  for (const key of Object.keys(all)) {
    const s = all[key] || {};
    base.gols += s.gols ?? 0;
    base.assistencias += s.assistencias ?? 0;
    base.partidas += s.partidas ?? 0;
  }

  return base;
}

// converte links de YouTube (watch / youtu.be) para embed
function toYoutubeEmbed(url: string | null | undefined) {
  if (!url) return null;

  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }

    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return url;
  }

  return url;
}

function clampPct01(p?: number | null) {
  if (typeof p !== "number" || Number.isNaN(p)) return null;
  if (p < 0) return 0;
  if (p > 1) return 1;
  return p;
}

function isPct0to1(p?: number | null) {
  return typeof p === "number" && !Number.isNaN(p) && p >= 0 && p <= 1;
}

/* ========================= HOOK CLICK OUTSIDE ========================= */

function useClickOutside<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return ref;
}

/* ========================= SELECT DE TEMPORADA ========================= */

type SeasonValue = "todas" | string;

function SeasonSelect({
  value,
  options,
  onChange,
}: {
  value: SeasonValue;
  options: SeasonValue[];
  onChange: (v: SeasonValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  const label = (v: SeasonValue) =>
    v === "todas" ? "Todas as temporadas" : String(v);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-[10px] text-[13px] text-gray-900 cursor-pointer hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label(value)}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <ul
          className="absolute top-[calc(100%+6px)] left-0 min-w-[220px] bg-white border border-gray-200 rounded-xl shadow z-20 p-1.5"
          role="listbox"
        >
          {options.map((opt) => {
            const active = opt === value;
            return (
              <li
                key={String(opt)}
                className={`px-2.5 py-2 rounded-lg cursor-pointer text-[13px] ${
                  active ? "bg-gray-200 font-bold" : "hover:bg-gray-100"
                }`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {label(opt)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ========================= PÁGINA ========================= */

export default function PlayerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [jogador, setJogador] = useState<Jogador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<SeasonValue>("todas");

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetch(`/api/jogadores/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Erro HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: { jogador: Jogador }) => {
        setJogador(data.jogador);
      })
      .catch((err) => {
        setError(err.message);
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading)
    return (
      <section className="p-6 max-w-[1100px] mx-auto">
        <p className="text-sm text-gray-700">Carregando jogador...</p>
      </section>
    );

  if (error || !jogador)
    return (
      <section className="p-6 max-w-[1100px] mx-auto">
        <h3 className="font-bold text-lg mb-1">Jogador não encontrado</h3>
        {error && (
          <p className="text-xs text-red-600 mb-2">Detalhe técnico: {error}</p>
        )}
        <Link href="/jogadores" className="underline text-sm text-gray-800">
          Voltar
        </Link>
      </section>
    );

  const fotoUrl = jogador.imagemUrl || null;
  const pe = jogador.peDominante;
  const isDomDireito = pe === "D";

  const leftFootSrc = isDomDireito
    ? getFootSrc("esquerdo")
    : getFootSrc("esquerdo_dominante");

  const rightFootSrc = isDomDireito
    ? getFootSrc("direito_dominante")
    : getFootSrc("direito");

  const statsPorTemporada = jogador.statsPorTemporada || null;
  const temStats =
    statsPorTemporada && Object.keys(statsPorTemporada).length > 0;

  let seasonOptions: SeasonValue[] = ["todas"];
  if (temStats && statsPorTemporada) {
    const keys = Object.keys(statsPorTemporada).sort(
      (a, b) => Number(b) - Number(a),
    );
    seasonOptions = ["todas", ...keys];
  }

  let stats = { gols: 0, assistencias: 0, partidas: 0 };
  if (temStats && statsPorTemporada) {
    if (season === "todas") {
      stats = sumStats(statsPorTemporada);
    } else {
      const s = statsPorTemporada[season] || {};
      stats = {
        gols: s.gols ?? 0,
        assistencias: s.assistencias ?? 0,
        partidas: s.partidas ?? 0,
      };
    }
  }

  const videoRaw = jogador.videoUrl || jogador.youtubeUrl || null;
  const videoEmbed = toYoutubeEmbed(videoRaw);

  const showResumo = !!(temStats || videoEmbed);
  const showInstagram = !!jogador.instagramHandle;

  const valorMercadoInteiro = (jogador.valorMercado ?? 0) * 1_000_000;
  const mostrarValorMercado = valorMercadoInteiro > 0;

  const posseRaw =
    typeof jogador.possePct === "number" ? jogador.possePct : null;
  const posseFrac =
    posseRaw == null
      ? null
      : isPct0to1(posseRaw)
        ? posseRaw
        : clampPct01(posseRaw / 100);

  const valorSerranoInteiro =
    posseFrac != null ? valorMercadoInteiro * posseFrac : 0;
  const mostrarValorSerrano = valorSerranoInteiro > 0;

  const possePctLabel =
    posseFrac == null ? null : `${(posseFrac * 100).toFixed(1)}%`;

  const clubName = jogador.clubeNome ?? jogador.clubeRef?.nome ?? null;
  const clubLogo = jogador.clubeRef?.logoUrl ?? null;

  return (
    <section className="px-[22px] pt-[18px] pb-[26px] max-w-[1100px] mx-auto">
      <header className="grid grid-cols-[1fr_auto] bg-white border border-gray-200 rounded-[14px] p-[18px] mb-3.5 items-center gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-32 h-32 rounded-full bg-linear-to-br from-[#eef2ff] to-white border border-[#dfe3f0] grid place-items-center overflow-hidden shrink-0">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={jogador.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-extrabold text-[#003399] text-[30px]">
                {initials(jogador.nome)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 min-w-0">
            <h1 className="m-0 text-2xl font-extrabold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
              {jogador.nome}
            </h1>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-[#003399] text-white text-xs rounded-full font-extrabold tracking-wide">
                {jogador.posicao}
              </span>

              <span className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-xs rounded-full font-semibold text-gray-900">
                Idade: {jogador.idade}
              </span>

              {jogador.situacao && (
                <span className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-xs rounded-full font-semibold text-gray-900">
                  {jogador.situacao}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] text-gray-600">Pé dominante:</span>
              <div className="inline-flex items-center gap-0.5">
                <img
                  src={leftFootSrc}
                  alt=""
                  aria-hidden
                  className={isDomDireito ? "h-4 w-4" : "h-[22px] w-[22px]"}
                />
                <img
                  src={rightFootSrc}
                  alt=""
                  aria-hidden
                  className={isDomDireito ? "h-[22px] w-[22px]" : "h-4 w-4"}
                />
              </div>
              <span className="font-bold text-gray-900 text-[13px]">
                {labelDominante(pe)}
              </span>
            </div>
          </div>
        </div>

        <div className="justify-self-end">
          {clubName ? (
            <ClubBadge nome={clubName} logoUrl={clubLogo} />
          ) : (
            <div className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-500">
              Clube não informado
            </div>
          )}
        </div>
      </header>

      <section className="bg-white border border-gray-200 rounded-[14px] p-4 mb-3.5">
        <h2 className="font-extrabold text-base mb-3 text-slate-900">
          Informações
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {jogador.representacao && (
            <Info label="Representação" value={jogador.representacao} />
          )}

          {possePctLabel && (
            <Info label="Posse Serrano" value={possePctLabel} />
          )}

          {typeof jogador.numeroCamisa === "number" && (
            <Info label="Número da camisa" value={`#${jogador.numeroCamisa}`} />
          )}

          {typeof jogador.altura === "number" && (
            <Info label="Altura" value={`${jogador.altura} cm`} />
          )}

          {mostrarValorMercado && (
            <Info
              label="Valor mercado"
              value={valorMercadoInteiro.toLocaleString("pt-BR", {
                style: "currency",
                currency: "EUR",
              })}
            />
          )}

          {mostrarValorSerrano && (
            <Info
              label="Valor do Serrano"
              value={valorSerranoInteiro.toLocaleString("pt-BR", {
                style: "currency",
                currency: "EUR",
              })}
            />
          )}

          {jogador.passaporte?.europeu && (
            <Info
              label="Passaporte UE"
              value={
                <>
                  <img
                    src={PASSPORT_EU}
                    alt="Passaporte UE"
                    className="w-4 h-4 inline-block align-middle mr-1"
                  />
                  {jogador.passaporte.pais}
                </>
              }
            />
          )}

          {jogador.selecao?.convocado && (
            <Info
              label="Seleção"
              value={`Convocado${
                jogador.selecao.anos?.length
                  ? ` (${jogador.selecao.anos.join(", ")})`
                  : ""
              }${
                jogador.selecao.categoria
                  ? ` – ${jogador.selecao.categoria}`
                  : ""
              }`}
            />
          )}
        </div>
      </section>

      {showResumo && (
        <section className="bg-white border border-gray-200 rounded-[14px] p-4 mb-3.5">
          <h2 className="font-extrabold text-base text-slate-900 m-0">
            Resumo
          </h2>

          <div className="mt-4 grid grid-cols-[1fr_1.2fr] gap-6 items-stretch">
            <div className="flex flex-col h-full">
              <div className="flex justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-gray-600">Temporada</span>
                  <SeasonSelect
                    value={season}
                    options={seasonOptions}
                    onChange={setSeason}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-1 items-center justify-center">
                <div className="flex justify-center gap-10">
                  <StatItem label="Gols" value={stats.gols} />
                  <StatItem label="Assistências" value={stats.assistencias} />
                  <StatItem label="Partidas" value={stats.partidas} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              {videoEmbed ? (
                <div className="w-full max-w-[560px] aspect-video bg-black rounded-xl overflow-hidden shadow-[0_10px_28px_rgba(0,0,0,0.12)]">
                  <iframe
                    className="w-full h-full block"
                    src={videoEmbed}
                    title="Vídeo do jogador"
                    frameBorder={0}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full max-w-[560px] aspect-video rounded-xl border border-gray-200 bg-gray-50 grid place-items-center text-sm text-gray-500">
                  Sem vídeo cadastrado
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {showInstagram && (
        <section className="bg-white border border-gray-200 rounded-[14px] p-4 mb-3.5">
          <div className="flex justify-between items-center mb-3 gap-3">
            <h2 className="font-extrabold text-base text-slate-900 m-0">
              Instagram
            </h2>
            <a
              href={`https://www.instagram.com/${jogador.instagramHandle!.replace(
                "@",
                "",
              )}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[13px] font-bold text-gray-900 border border-gray-200 rounded-full px-2.5 py-1.5 bg-white"
            >
              <Instagram size={16} />
              <span>@{jogador.instagramHandle!.replace("@", "")}</span>
            </a>
          </div>

          {jogador.instagramPosts && jogador.instagramPosts.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5 auto-rows-fr">
              {jogador.instagramPosts.slice(0, 6).map((post, i) => (
                <a
                  key={i}
                  href={post.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-full aspect-square rounded-xl overflow-hidden border border-[#eef1f5] bg-white group"
                >
                  {post.thumbUrl && (
                    <img
                      src={post.thumbUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover block transition-transform duration-200 ease-out group-hover:scale-[1.04]"
                    />
                  )}
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

/* ========================= COMPONENTES AUXILIARES ========================= */

function ClubBadge({
  nome,
  logoUrl,
}: {
  nome: string;
  logoUrl?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] border border-gray-200 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.05)]">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={nome}
          className="w-10 h-10 rounded-full object-contain bg-white border border-gray-100"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200 grid place-items-center text-gray-700 font-extrabold">
          {nome[0]}
        </div>
      )}

      <div className="flex flex-col leading-tight">
        <span className="text-[11px] uppercase tracking-wider text-gray-500">
          Clube
        </span>
        <span className="font-extrabold text-[13px] text-gray-900 max-w-[220px] whitespace-nowrap overflow-hidden text-ellipsis">
          {nome}
        </span>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="bg-gray-50 border border-[#eef1f5] rounded-[10px] px-3 py-2.5 flex flex-col">
      <span className="text-gray-500 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className="font-bold text-[13px] text-gray-900">{value}</span>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center min-w-[90px]">
      <span className="text-[28px] font-extrabold text-slate-900 leading-none">
        {value}
      </span>
      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}
