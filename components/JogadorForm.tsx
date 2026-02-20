"use client";

import React, { FormEvent, useMemo, useState } from "react";

import type { Jogador, Posicao, Pe, SeasonStats } from "@/type/jogador";

import AdminSectionCard from "@/components/Atoms/AdminSectionCard";
import FormField from "@/components/Atoms/FormField";
import ClubSelect from "@/components/Atoms/ClubSelect";
import ImageUploadButton from "@/components/Atoms/ImageUploadButton";

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

const INPUT_CLASSES =
  "rounded-[10px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-[#003399]/30 focus:border-[#003399] placeholder:text-gray-400";

export type JogadorFormModel = Partial<Jogador> & {
  clubeId?: string | null;
  clubeRef?: { id: string; nome: string; slug?: string; logoUrl?: string | null } | null;
};

type Props = {
  form: JogadorFormModel;
  setForm: React.Dispatch<React.SetStateAction<JogadorFormModel>>;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  saving?: boolean;

  submitLabel: string;
  cancelLabel?: string;
  onCancel: () => void;

  requireClub?: boolean;
};

function calcAgeFromYear(year?: number | null) {
  if (!year || !Number.isFinite(year)) return null;
  const now = new Date();
  const age = now.getFullYear() - year;
  return age < 0 ? 0 : age;
}

export default function JogadorForm({
  form,
  setForm,
  onSubmit,
  saving,
  submitLabel,
  cancelLabel = "Cancelar",
  onCancel,
  requireClub = false,
}: Props) {
  const [newSeasonYear, setNewSeasonYear] = useState<string>("");

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

  function handleAnoNascimentoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    const year = v === "" || Number.isNaN(Number(v)) ? null : Number(v);

    updateField("anoNascimento", year);
    updateField("idade", calcAgeFromYear(year)); // compat (enquanto backend ainda tiver idade)
  }

  function handleStatsFieldChange(seasonKey: string, field: keyof SeasonStats) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;

      let num: number | undefined;
      if (v === "" || Number.isNaN(Number(v))) num = undefined;
      else {
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
      if (base[year]) return prev ?? {};

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

  const statsCount = useMemo(
    () => Object.keys(form.statsPorTemporada ?? {}).length,
    [form.statsPorTemporada]
  );

  const idadeCalc = useMemo(
    () => calcAgeFromYear((form as any).anoNascimento ?? null),
    [form]
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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

          <FormField label="Clube atual (cadastro)">
            <div className="space-y-2">
              <ClubSelect
                value={(form as any).clubeId ?? null}
                onChange={(club) => {
                  updateField("clubeId", club?.id ?? null);
                  updateField("clube", club?.nome ?? "");
                }}
                placeholder="Selecione um clube..."
                allowClear={!requireClub}
              />

              <div className="text-[12px] text-gray-500">
                Isso salva <b>clubeId</b> (novo) e mantém <b>clube</b> (texto) por compatibilidade.
              </div>
            </div>
          </FormField>

          <FormField label="Ano de nascimento">
            <input
              type="number"
              className={INPUT_CLASSES}
              value={(form as any).anoNascimento ?? ""}
              onChange={handleAnoNascimentoChange}
              placeholder="Ex.: 2005"
              min={1950}
              max={new Date().getFullYear()}
            />
          </FormField>

          <FormField label="Idade (calculada)">
            <input
              className={INPUT_CLASSES + " bg-gray-50 text-gray-600"}
              value={idadeCalc ?? ""}
              readOnly
              aria-readonly="true"
              placeholder="—"
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

          <FormField label="Valor de mercado (em milhões de €)">
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
              value={(form as any).representacao ?? ""}
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

      <AdminSectionCard title="Dados complementares">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
            value={form.racionalProspecao ?? (form as any).observacoes ?? ""}
            onChange={(e) => updateField("racionalProspecao", e.target.value)}
            placeholder="Resumo rápido do porquê esse atleta é interessante para o Serrano."
          />
        </FormField>
      </AdminSectionCard>

      <AdminSectionCard title="Mídia & redes">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Foto do jogador (upload)">
            <ImageUploadButton
              valueUrl={form.imagemUrl ?? ""}
              onUploaded={({ secureUrl }) => updateField("imagemUrl", secureUrl)}
              onClear={() => updateField("imagemUrl", "")}
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

      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">
          Estatísticas por temporada
        </h2>
        <p className="text-xs text-gray-500">
          Gols, assistências e partidas por ano. Esses dados alimentam o bloco
          &quot;Resumo&quot; na página pública do jogador.
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

          {statsCount === 0 && (
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
                if (!v) updateField("passaporte", null);
                else {
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
                if (!v) updateField("selecao", null);
                else {
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

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
        >
          {cancelLabel}
        </button>

        <button
          type="submit"
          disabled={!!saving}
          className="rounded-lg bg-[#f2d249] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
