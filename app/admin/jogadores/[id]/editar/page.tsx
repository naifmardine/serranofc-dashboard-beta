"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import type { Jogador, Posicao, Pe, SeasonStats } from "@/type/jogador";

import SuccessDialog from "@/components/Atoms/SuccessDialog";
import AdminSectionCard from "@/components/Atoms/AdminSectionCard";
import FormField from "@/components/Atoms/FormField";
import ClubSelect from "@/components/Atoms/ClubSelect";

const POSICOES: Posicao[] = [
  "GOL",
  "LD",
  "ZAG",
  "LE",
  "VOL",
  "MC",
  "MEI",
  "PD",
  "PE",
  "ATA",
];

const POSICAO_LABEL: Record<Posicao, string> = {
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

const PE_LABEL: Record<Pe, string> = {
  D: "Direito",
  E: "Esquerdo",
};

// classe base pros inputs
const INPUT_CLASSES =
  "rounded-[10px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-[#003399]/30 focus:border-[#003399] placeholder:text-gray-400";

// ✅ estende o form pra suportar clubeId/clubeRef mesmo que o type Jogador ainda não tenha
type JogadorForm = Partial<Jogador> & {
  clubeId?: string | null;
  clubeRef?: { id: string; nome: string; slug?: string; logoUrl?: string | null } | null;
};

export default function EditarJogadorPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [form, setForm] = useState<JogadorForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [newSeasonYear, setNewSeasonYear] = useState<string>("");

  // carrega jogador
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
      .then((data: { jogador: any }) => {
        const j = data.jogador as JogadorForm;

        // ✅ se vier clubeRef e não vier clubeId, tenta preencher
        const clubeIdFromRef = j?.clubeRef?.id ?? null;

        setForm({
          ...j,
          clubeId: (j as any).clubeId ?? clubeIdFromRef,
          // mantém legado clube string preenchido quando possível
          clubeRef: (j as any).clube ?? j?.clubeRef?.nome ?? "",
        });
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  function updateField(field: string, value: any) {
    setForm((prev) => ({
      ...(prev ?? {}),
      [field]: value,
    }));
  }

  function handleTextChange<K extends keyof Jogador>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(field as string, e.target.value);
    };
  }

  function handleNumberChange<K extends keyof Jogador>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      const num = v === "" || Number.isNaN(Number(v)) ? null : Number(v);
      updateField(field as string, num);
    };
  }

  function handleSelectChange<K extends keyof Jogador>(field: K) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateField(field as string, e.target.value);
    };
  }

  function handleStatsFieldChange(seasonKey: string, field: keyof SeasonStats) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;

      let num: number | undefined;
      if (v === "" || Number.isNaN(Number(v))) {
        num = undefined;
      } else {
        const parsed = Number(v);
        num = parsed < 0 ? 0 : parsed;
      }

      setForm((prev) => {
        const base =
          ((prev?.statsPorTemporada ?? {}) as Record<string, SeasonStats>) || {};
        const current = base[seasonKey] ?? {};
        const updatedSeason: SeasonStats = { ...current, [field]: num };

        const updated: Record<string, SeasonStats> = {
          ...base,
          [seasonKey]: updatedSeason,
        };

        return {
          ...(prev ?? {}),
          statsPorTemporada: updated,
        };
      });
    };
  }

  function handleRemoveSeason(seasonKey: string) {
    setForm((prev) => {
      const base =
        ((prev?.statsPorTemporada ?? {}) as Record<string, SeasonStats>) || {};
      const updated: Record<string, SeasonStats> = { ...base };
      delete updated[seasonKey];

      const hasKeys = Object.keys(updated).length > 0;

      return {
        ...(prev ?? {}),
        statsPorTemporada: hasKeys ? updated : null,
      };
    });
  }

  function handleAddSeason() {
    const year = newSeasonYear.trim();
    if (!year) return;

    setForm((prev) => {
      const base =
        ((prev?.statsPorTemporada ?? {}) as Record<string, SeasonStats>) || {};

      if (base[year]) return prev ?? null;

      const updated: Record<string, SeasonStats> = {
        ...base,
        [year]: { gols: 0, assistencias: 0, partidas: 0 },
      };

      return {
        ...(prev ?? {}),
        statsPorTemporada: updated,
      };
    });

    setNewSeasonYear("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !form) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // ✅ não manda clubeRef pro backend (não precisa)
      const payload = { ...form } as any;
      delete payload.clubeRef;

      const res = await fetch(`/api/jogadores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      const j = data.jogador as JogadorForm;

      setForm({
        ...j,
        clubeId: (j as any).clubeId ?? j?.clubeRef?.id ?? (form as any).clubeId ?? null,
        clubeRef: (j as any).clube ?? j?.clubeRef?.nome ?? (form as any).clube ?? "",
      });

      setSuccessMsg("Jogador atualizado com sucesso.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao salvar jogador.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <section className="p-6 max-w-5xl mx-auto">
        <p className="text-sm text-gray-700">Carregando dados do jogador...</p>
      </section>
    );
  }

  if (error && !form) {
    return (
      <section className="p-6 max-w-5xl mx-auto">
        <h1 className="font-bold text-lg mb-2">Erro ao carregar jogador</h1>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <Link href="/admin/jogadores" className="text-sm underline">
          Voltar
        </Link>
      </section>
    );
  }

  return (
    <>
      <SuccessDialog
        open={!!successMsg}
        title="Jogador atualizado"
        description={successMsg ?? undefined}
        secondaryLabel="Continuar editando"
        primaryLabel="Ver jogador"
        onSecondary={() => setSuccessMsg(null)}
        onPrimary={() => {
          setSuccessMsg(null);
          router.push(`/jogadores/${id}`);
        }}
      />

      <section className="p-6 max-w-5xl mx-auto">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">
              Admin &gt; Jogadores &gt; Editar
            </div>
            <h1 className="text-xl font-bold text-slate-900">Editar jogador</h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin/jogadores")}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100"
          >
            Voltar
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* DADOS BÁSICOS */}
          <AdminSectionCard title="Dados básicos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Nome do jogador">
                <input
                  className={INPUT_CLASSES}
                  value={form.nome ?? ""}
                  onChange={handleTextChange("nome")}
                  required
                />
              </FormField>

              {/* ✅ NOVO: Clube via cadastro (busca + select) */}
              <FormField label="Clube atual (cadastro)">
                <div className="space-y-2">
                  <ClubSelect
                    value={(form as any).clubeId ?? null}
                    onChange={(club) => {
                      // grava o relation
                      updateField("clubeId", club?.id ?? null);
                      // mantém legado string sincronizado (pra compatibilidade)
                      updateField("clube", club?.nome ?? "");
                    }}
                    placeholder="Selecione um clube..."
                    allowClear
                  />

                  <div className="text-[12px] text-gray-500">
                    Selecionar aqui define <b>clubeId</b>. O campo <b>clube</b> (texto) é mantido só por compatibilidade.
                  </div>
                </div>
              </FormField>

              <FormField label="Idade">
                <input
                  type="number"
                  className={INPUT_CLASSES}
                  value={form.idade ?? ""}
                  onChange={handleNumberChange("idade")}
                  min={10}
                  max={50}
                />
              </FormField>

              <FormField label="Posição">
                <select
                  className={INPUT_CLASSES}
                  value={form.posicao ?? ""}
                  onChange={handleSelectChange("posicao")}
                >
                  <option value="">Selecione...</option>
                  {POSICOES.map((p) => (
                    <option key={p} value={p}>
                      {p} — {POSICAO_LABEL[p]}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Pé dominante">
                <select
                  className={INPUT_CLASSES}
                  value={form.peDominante ?? ""}
                  onChange={handleSelectChange("peDominante")}
                >
                  <option value="">Selecione...</option>
                  <option value="D">{PE_LABEL.D}</option>
                  <option value="E">{PE_LABEL.E}</option>
                </select>
              </FormField>

              <FormField label="Valor de mercado (em milhões)">
                <input
                  type="number"
                  step="0.01"
                  className={INPUT_CLASSES}
                  value={form.valorMercado ?? ""}
                  onChange={handleNumberChange("valorMercado")}
                  placeholder="Ex.: 1.5"
                />
              </FormField>

              <FormField label="Variação % (último período)">
                <input
                  type="number"
                  step="0.1"
                  className={INPUT_CLASSES}
                  value={form.variacaoPct ?? ""}
                  onChange={handleNumberChange("variacaoPct")}
                  placeholder="Ex.: 33.3"
                />
              </FormField>

              <FormField label="% Serrano (posse)">
                <input
                  type="number"
                  step="1"
                  className={INPUT_CLASSES}
                  value={form.possePct ?? ""}
                  onChange={handleNumberChange("possePct")}
                  placeholder="Ex.: 40"
                />
              </FormField>

              <FormField label="Representação / agência">
                <input
                  className={INPUT_CLASSES}
                  value={form.representacao ?? ""}
                  onChange={handleTextChange("representacao")}
                  placeholder="Ex.: RSF"
                />
              </FormField>

              <FormField label="Situação contratual">
                <input
                  className={INPUT_CLASSES}
                  value={form.situacao ?? ""}
                  onChange={handleTextChange("situacao")}
                  placeholder="Ex.: Empréstimo até 06/2026"
                />
              </FormField>

              <FormField label="Número da camisa">
                <input
                  type="number"
                  className={INPUT_CLASSES}
                  value={form.numeroCamisa ?? ""}
                  onChange={handleNumberChange("numeroCamisa")}
                  placeholder="Ex.: 9"
                />
              </FormField>

              <FormField label="Altura (cm)">
                <input
                  type="number"
                  className={INPUT_CLASSES}
                  value={form.altura ?? ""}
                  onChange={handleNumberChange("altura")}
                  placeholder="Ex.: 182"
                />
              </FormField>
            </div>
          </AdminSectionCard>

          {/* DADOS COMPLEMENTARES */}
          <AdminSectionCard title="Dados complementares">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <FormField label="Ano de nascimento">
                <input
                  type="number"
                  className={INPUT_CLASSES}
                  value={form.anoNascimento ?? ""}
                  onChange={handleNumberChange("anoNascimento")}
                  placeholder="Ex.: 2005"
                />
              </FormField>

              <FormField label="Cidade">
                <input
                  className={INPUT_CLASSES}
                  value={form.cidade ?? ""}
                  onChange={handleTextChange("cidade")}
                  placeholder="Ex.: Rio de Janeiro"
                />
              </FormField>

              <FormField label="Nacionalidade">
                <input
                  className={INPUT_CLASSES}
                  value={form.nacionalidade ?? ""}
                  onChange={handleTextChange("nacionalidade")}
                  placeholder="Ex.: Brasil"
                />
              </FormField>
            </div>

            <FormField label="Observações / racional de prospecção">
              <textarea
                rows={3}
                className={INPUT_CLASSES + " resize-none"}
                value={form.racionalProspecao ?? form.observacoes ?? ""}
                onChange={(e) =>
                  updateField("racionalProspecao", e.target.value)
                }
                placeholder="Resumo rápido do porquê esse atleta é interessante para o Serrano."
              />
            </FormField>
          </AdminSectionCard>

          {/* MÍDIA & REDES */}
          <AdminSectionCard title="Mídia & redes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="URL da foto (imagem)">
                <input
                  className={INPUT_CLASSES}
                  value={form.imagemUrl ?? ""}
                  onChange={handleTextChange("imagemUrl")}
                  placeholder="https://..."
                />
              </FormField>

              <FormField label="URL do vídeo (YouTube)">
                <input
                  className={INPUT_CLASSES}
                  value={form.videoUrl ?? ""}
                  onChange={handleTextChange("videoUrl")}
                  placeholder="https://youtube.com/..."
                />
              </FormField>

              <FormField label="Instagram (@handle)">
                <input
                  className={INPUT_CLASSES}
                  value={form.instagramHandle ?? ""}
                  onChange={handleTextChange("instagramHandle")}
                  placeholder="@jogador10"
                />
              </FormField>

              <FormField label="X (Twitter) URL">
                <input
                  className={INPUT_CLASSES}
                  value={form.xUrl ?? ""}
                  onChange={handleTextChange("xUrl")}
                  placeholder="https://x.com/..."
                />
              </FormField>

              <FormField label="YouTube URL (canal ou playlist)">
                <input
                  className={INPUT_CLASSES}
                  value={form.youtubeUrl ?? ""}
                  onChange={handleTextChange("youtubeUrl")}
                  placeholder="https://youtube.com/..."
                />
              </FormField>
            </div>
          </AdminSectionCard>

          {/* ESTATÍSTICAS POR TEMPORADA */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">
              Estatísticas por temporada
            </h2>
            <p className="text-xs text-gray-500">
              Gols, assistências e partidas por ano. Esses dados alimentam o
              bloco &quot;Resumo&quot; na página pública do jogador.
            </p>

            <div className="space-y-3">
              {Object.entries(
                (form.statsPorTemporada ?? {}) as Record<string, SeasonStats>
              ).map(([seasonKey, st]) => (
                <div
                  key={seasonKey}
                  className="grid grid-cols-1 gap-2 md:grid-cols-[90px_repeat(3,minmax(0,1fr))_auto] items-end"
                >
                  <FormField label="Temporada">
                    <input className="input" value={seasonKey} readOnly />
                  </FormField>

                  <FormField label="Gols">
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={st.gols ?? ""}
                      onChange={handleStatsFieldChange(seasonKey, "gols")}
                    />
                  </FormField>

                  <FormField label="Assistências">
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={st.assistencias ?? ""}
                      onChange={handleStatsFieldChange(seasonKey, "assistencias")}
                    />
                  </FormField>

                  <FormField label="Partidas">
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={st.partidas ?? ""}
                      onChange={handleStatsFieldChange(seasonKey, "partidas")}
                    />
                  </FormField>

                  <button
                    type="button"
                    onClick={() => handleRemoveSeason(seasonKey)}
                    className="mt-4 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              ))}

              {Object.keys(form.statsPorTemporada ?? {}).length === 0 && (
                <p className="text-xs text-gray-500">
                  Nenhuma temporada cadastrada ainda.
                </p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[160px_auto] items-end">
              <FormField label="Nova temporada (ex: 2024)">
                <input
                  className="input"
                  value={newSeasonYear}
                  onChange={(e) => setNewSeasonYear(e.target.value)}
                  placeholder="2024"
                />
              </FormField>

              <button
                type="button"
                onClick={handleAddSeason}
                className="h-[38px] rounded-lg bg-[#f2d249] px-4 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                Adicionar temporada
              </button>
            </div>
          </div>

          {/* PASSAPORTE & SELEÇÃO */}
          <AdminSectionCard title="Passaporte & Seleção">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Passaporte europeu?">
                <select
                  className={INPUT_CLASSES}
                  value={
                    form.passaporte?.europeu === true
                      ? "true"
                      : form.passaporte?.europeu === false
                      ? "false"
                      : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      updateField("passaporte", null);
                    } else {
                      updateField("passaporte", {
                        europeu: v === "true",
                        pais: form.passaporte?.pais ?? "",
                      });
                    }
                  }}
                >
                  <option value="">Não informado</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </FormField>

              <FormField label="País do passaporte europeu">
                <input
                  className={INPUT_CLASSES}
                  value={form.passaporte?.pais ?? ""}
                  onChange={(e) =>
                    updateField("passaporte", {
                      europeu: form.passaporte?.europeu ?? true,
                      pais: e.target.value,
                    })
                  }
                  placeholder="Ex.: Portugal"
                />
              </FormField>

              <FormField label="Convocado para seleção?">
                <select
                  className={INPUT_CLASSES}
                  value={
                    form.selecao?.convocado === true
                      ? "true"
                      : form.selecao?.convocado === false
                      ? "false"
                      : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      updateField("selecao", null);
                    } else {
                      updateField("selecao", {
                        convocado: v === "true",
                        anos: form.selecao?.anos ?? [],
                        categoria: form.selecao?.categoria ?? "",
                      });
                    }
                  }}
                >
                  <option value="">Não informado</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </FormField>

              <FormField label="Anos de convocação (separados por vírgula)">
                <input
                  className={INPUT_CLASSES}
                  placeholder="2023, 2024..."
                  value={(form.selecao?.anos ?? []).join(", ")}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const anos = raw
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((s) => Number(s))
                      .filter((n) => !Number.isNaN(n));
                    updateField("selecao", {
                      convocado: form.selecao?.convocado ?? true,
                      anos,
                      categoria: form.selecao?.categoria ?? "",
                    });
                  }}
                />
              </FormField>

              <FormField label="Categoria (Sub-20, Principal...)">
                <input
                  className={INPUT_CLASSES}
                  value={form.selecao?.categoria ?? ""}
                  onChange={(e) =>
                    updateField("selecao", {
                      convocado: form.selecao?.convocado ?? true,
                      anos: form.selecao?.anos ?? [],
                      categoria: e.target.value,
                    })
                  }
                  placeholder="Ex.: Sub-20"
                />
              </FormField>
            </div>
          </AdminSectionCard>

          {/* AÇÕES */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/admin/jogadores")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#f2d249] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Salvando..." : "Salvar jogador"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
