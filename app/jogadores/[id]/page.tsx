"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import type { Jogador, SeasonStats } from "@/type/jogador";
import PageTitle from "@/components/Atoms/PageTitle";
import { ArrowLeft, ChevronDown, Instagram } from "lucide-react";

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

function useClickOutside<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
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

  const label = (v: SeasonValue) => (v === "todas" ? "Todas as temporadas" : String(v));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label(value)}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <ul
          className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[220px] rounded-xl border border-gray-200 bg-white p-1.5 shadow"
          role="listbox"
        >
          {options.map((opt) => {
            const active = opt === value;
            return (
              <li
                key={String(opt)}
                className={[
                  "cursor-pointer rounded-lg px-2.5 py-2 text-[13px]",
                  active ? "bg-gray-200 font-bold" : "hover:bg-gray-100",
                ].join(" ")}
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

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/jogadores/${id}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Erro HTTP ${res.status}`);
        }

        const data = (await res.json().catch(() => ({}))) as { jogador?: Jogador } | Jogador;
        const j = (data as any)?.jogador ?? data;

        if (!active) return;
        setJogador(j as Jogador);
      } catch (err: any) {
        if (!active) return;
        console.error(err);
        setError(err?.message || "Erro ao carregar jogador.");
        setJogador(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-[1100px] bg-gray-50 p-6">
        <p className="text-sm text-gray-700">Carregando jogador...</p>
      </section>
    );
  }

  if (error || !jogador) {
    return (
      <section className="mx-auto w-full max-w-[1100px] bg-gray-50 p-6">
        <PageTitle
          base="Principal"
          title="Jogador"
          subtitle="Não foi possível carregar o perfil."
          actions={
            <Link
              href="/jogadores"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          }
        />

        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ? `Detalhe técnico: ${error}` : "Jogador não encontrado."}
        </div>
      </section>
    );
  }

  const fotoUrl = jogador.imagemUrl || null;
  const pe = jogador.peDominante;
  const isDomDireito = pe === "D";

  const leftFootSrc = isDomDireito ? getFootSrc("esquerdo") : getFootSrc("esquerdo_dominante");
  const rightFootSrc = isDomDireito ? getFootSrc("direito_dominante") : getFootSrc("direito");

  const statsPorTemporada = jogador.statsPorTemporada || null;
  const temStats = !!(statsPorTemporada && Object.keys(statsPorTemporada).length > 0);

  let seasonOptions: SeasonValue[] = ["todas"];
  if (temStats && statsPorTemporada) {
    const keys = Object.keys(statsPorTemporada).sort((a, b) => Number(b) - Number(a));
    seasonOptions = ["todas", ...keys];
  }

  let stats = { gols: 0, assistencias: 0, partidas: 0 };
  if (temStats && statsPorTemporada) {
    if (season === "todas") stats = sumStats(statsPorTemporada);
    else {
      const s = statsPorTemporada[season] || {};
      stats = { gols: s.gols ?? 0, assistencias: s.assistencias ?? 0, partidas: s.partidas ?? 0 };
    }
  }

  const videoRaw = jogador.videoUrl || jogador.youtubeUrl || null;
  const videoEmbed = toYoutubeEmbed(videoRaw);

  const showResumo = !!(temStats || videoEmbed);
  const showInstagram = !!jogador.instagramHandle;

  const valorMercadoInteiro = (jogador.valorMercado ?? 0) * 1_000_000;
  const mostrarValorMercado = valorMercadoInteiro > 0;

  const posseRaw = typeof jogador.possePct === "number" ? jogador.possePct : null;
  const posseFrac = posseRaw == null ? null : isPct0to1(posseRaw) ? posseRaw : clampPct01(posseRaw / 100);

  const valorSerranoInteiro = posseFrac != null ? valorMercadoInteiro * posseFrac : 0;
  const mostrarValorSerrano = valorSerranoInteiro > 0;

  const possePctLabel = posseFrac == null ? null : `${(posseFrac * 100).toFixed(1)}%`;

  const clubName = jogador.clubeNome ?? jogador.clubeRef?.nome ?? null;
  const clubLogo = jogador.clubeRef?.logoUrl ?? null;

  const pageTitle = "Perfil do jogador";

  const headerActions = (
    <Link
      href="/jogadores"
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
      title="Voltar para Jogadores"
    >
      <ArrowLeft className="h-4 w-4" />
      Jogadores
    </Link>
  );

  return (
    <section className="mx-auto w-full max-w-[1100px] bg-gray-50 px-[22px] pb-[26px] pt-[18px]">
      <PageTitle
        base="Principal"
        title={pageTitle}
        subtitle="Perfil completo do atleta (dados, valor, posse, estatísticas e mídia)."
        actions={headerActions}
        className="mb-4"
        crumbLabel="Jogadores"
      />

      <header className="mb-3.5 grid grid-cols-[1fr_auto] items-center gap-4 rounded-[14px] border border-gray-200 bg-white p-[18px]">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-full border border-[#dfe3f0] bg-linear-to-br from-[#eef2ff] to-white">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt={jogador.nome} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[30px] font-extrabold text-[#003399]">
                {initials(jogador.nome)}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-extrabold text-slate-900">
              {jogador.nome}
            </h1>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#003399] px-3 py-1.5 text-xs font-extrabold tracking-wide text-white">
                {jogador.posicao}
              </span>

              <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-900">
                Idade: {jogador.idade}
              </span>

              {jogador.situacao ? (
                <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-900">
                  {jogador.situacao}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
              <span className="text-[13px] font-bold text-gray-900">
                {labelDominante(pe)}
              </span>
            </div>
          </div>
        </div>

        <div className="justify-self-end">
          {clubName ? (
            <ClubBadge nome={clubName} logoUrl={clubLogo} />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
              Clube não informado
            </div>
          )}
        </div>
      </header>

      <section className="mb-3.5 rounded-[14px] border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-extrabold text-slate-900">Informações</h2>

        <div className="grid grid-cols-3 gap-3">
          {jogador.representacao ? <Info label="Representação" value={jogador.representacao} /> : null}

          {possePctLabel ? <Info label="Posse Serrano" value={possePctLabel} /> : null}

          {typeof jogador.numeroCamisa === "number" ? (
            <Info label="Número da camisa" value={`#${jogador.numeroCamisa}`} />
          ) : null}

          {typeof jogador.altura === "number" ? <Info label="Altura" value={`${jogador.altura} cm`} /> : null}

          {mostrarValorMercado ? (
            <Info
              label="Valor mercado"
              value={valorMercadoInteiro.toLocaleString("pt-BR", { style: "currency", currency: "EUR" })}
            />
          ) : null}

          {mostrarValorSerrano ? (
            <Info
              label="Valor do Serrano"
              value={valorSerranoInteiro.toLocaleString("pt-BR", { style: "currency", currency: "EUR" })}
            />
          ) : null}

          {jogador.passaporte?.europeu ? (
            <Info
              label="Passaporte UE"
              value={
                <>
                  <img
                    src={PASSPORT_EU}
                    alt="Passaporte UE"
                    className="mr-1 inline-block h-4 w-4 align-middle"
                  />
                  {jogador.passaporte.pais}
                </>
              }
            />
          ) : null}

          {jogador.selecao?.convocado ? (
            <Info
              label="Seleção"
              value={`Convocado${
                jogador.selecao.anos?.length ? ` (${jogador.selecao.anos.join(", ")})` : ""
              }${jogador.selecao.categoria ? ` – ${jogador.selecao.categoria}` : ""}`}
            />
          ) : null}
        </div>
      </section>

      {showResumo ? (
        <section className="mb-3.5 rounded-[14px] border border-gray-200 bg-white p-4">
          <h2 className="m-0 text-base font-extrabold text-slate-900">Resumo</h2>

          <div className="mt-4 grid items-stretch gap-6 md:grid-cols-[1fr_1.2fr]">
            <div className="flex h-full flex-col">
              <div className="flex justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-gray-600">Temporada</span>
                  <SeasonSelect value={season} options={seasonOptions} onChange={setSeason} />
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
                <div className="aspect-video w-full max-w-[560px] overflow-hidden rounded-xl bg-black shadow-[0_10px_28px_rgba(0,0,0,0.12)]">
                  <iframe
                    className="block h-full w-full"
                    src={videoEmbed}
                    title="Vídeo do jogador"
                    frameBorder={0}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-video w-full max-w-[560px] rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 grid place-items-center">
                  Sem vídeo cadastrado
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {showInstagram ? (
        <section className="mb-3.5 rounded-[14px] border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 text-base font-extrabold text-slate-900">Instagram</h2>
            <a
              href={`https://www.instagram.com/${jogador.instagramHandle!.replace("@", "")}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] font-bold text-gray-900"
            >
              <Instagram size={16} />
              <span>@{jogador.instagramHandle!.replace("@", "")}</span>
            </a>
          </div>

          {jogador.instagramPosts && jogador.instagramPosts.length > 0 ? (
            <div className="grid auto-rows-fr grid-cols-3 gap-2.5">
              {jogador.instagramPosts.slice(0, 6).map((post, i) => (
                <a
                  key={i}
                  href={post.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square w-full overflow-hidden rounded-xl border border-[#eef1f5] bg-white"
                >
                  {post.thumbUrl ? (
                    <img
                      src={post.thumbUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 block h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04]"
                    />
                  ) : null}
                </a>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

/* ========================= COMPONENTES AUXILIARES ========================= */

function ClubBadge({ nome, logoUrl }: { nome: string; logoUrl?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.05)]">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={nome}
          className="h-10 w-10 rounded-full border border-gray-100 bg-white object-contain"
        />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gray-200 font-extrabold text-gray-700">
          {nome[0]}
        </div>
      )}

      <div className="flex flex-col leading-tight">
        <span className="text-[11px] uppercase tracking-wider text-gray-500">Clube</span>
        <span className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-extrabold text-gray-900">
          {nome}
        </span>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col rounded-[10px] border border-[#eef1f5] bg-gray-50 px-3 py-2.5">
      <span className="text-xs uppercase tracking-wider text-gray-500">{label}</span>
      <span className="text-[13px] font-bold text-gray-900">{value}</span>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[90px] text-center">
      <span className="leading-none text-[28px] font-extrabold text-slate-900">{value}</span>
      <div className="mt-1 text-xs uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}
