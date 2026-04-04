"use client";

import React, { FormEvent, useMemo, useState } from "react";

import type { Jogador, Posicao, Pe, SeasonStats } from "@/type/jogador";

import AdminSectionCard from "@/components/Atoms/AdminSectionCard";
import FormField from "@/components/Atoms/FormField";
import ClubSelect from "@/components/Atoms/ClubSelect";
import ImageUploadButton from "@/components/Atoms/ImageUploadButton";
import { useI18n } from "@/contexts/I18nContext";

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

// Position and foot labels are now i18n — see t.positions.* and t.foot.*

const INPUT_CLASSES =
  "rounded-[10px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-[#003399]/30 focus:border-[#003399] placeholder:text-gray-400";

export type JogadorFormModel = Partial<Jogador> & {
  // novos/compat
  clubeId?: string | null;
  clubeRef?: { id: string; nome: string; slug?: string; logoUrl?: string | null } | null;

  // novo campo (salvo normalizado: só dígitos)
  cpf?: string | null;
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

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function formatCPF(digitsRaw: string) {
  const d = onlyDigits(digitsRaw).slice(0, 11);

  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);

  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;

  return out;
}

export default function JogadorForm({
  form,
  setForm,
  onSubmit,
  saving,
  submitLabel,
  cancelLabel,
  onCancel,
  requireClub = false,
}: Props) {
  const { t } = useI18n();
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

  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = onlyDigits(e.target.value).slice(0, 11);
    updateField("cpf", digits); // salva normalizado (só números)
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
      <AdminSectionCard title={t.form.dadosBasicos}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label={t.form.nomeJogador}>
            <input
              className={INPUT_CLASSES}
              value={form.nome ?? ""}
              onChange={handleTextChange("nome")}
              required
            />
          </FormField>

          <FormField label={t.form.cpf}>
            <input
              className={INPUT_CLASSES}
              value={formatCPF((form as any).cpf ?? "")}
              onChange={handleCPFChange}
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              aria-label="CPF"
            />
          </FormField>

          <FormField label={t.form.clubeAtual}>
            <div className="space-y-2">
              <ClubSelect
                value={(form as any).clubeId ?? null}
                onChange={(club) => {
                  updateField("clubeId", club?.id ?? null);
                  updateField("clube", club?.nome ?? "");
                }}
                placeholder={t.form.selecioneClube}
                allowClear={!requireClub}
              />
            </div>
          </FormField>

          <FormField label={t.form.anoNascimento}>
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

          <FormField label={t.form.idadeCalc}>
            <input
              className={INPUT_CLASSES + " bg-gray-50 text-gray-600"}
              value={idadeCalc ?? ""}
              readOnly
              aria-readonly="true"
              placeholder="—"
            />
          </FormField>

          <FormField label={t.form.posicao}>
            <select
              className={INPUT_CLASSES}
              value={form.posicao ?? ""}
              onChange={handleSelectChange("posicao")}
            >
              <option value="">{t.form.selecione}</option>
              {POSICOES.map((p) => (
                <option key={p} value={p}>
                  {p} — {(t.positions as any)[p] ?? p}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t.form.peDominante}>
            <select
              className={INPUT_CLASSES}
              value={form.peDominante ?? ""}
              onChange={handleSelectChange("peDominante")}
            >
              <option value="">{t.form.selecione}</option>
              <option value="D">{t.foot.D}</option>
              <option value="E">{t.foot.E}</option>
            </select>
          </FormField>

          <FormField label={t.form.valorMercado}>
            <input
              type="number"
              step="0.01"
              className={INPUT_CLASSES}
              value={form.valorMercado ?? ""}
              onChange={handleNumberChange("valorMercado")}
              placeholder="Ex.: 1.5"
            />
          </FormField>

          <FormField label={t.form.posseSerrano}>
            <input
              type="number"
              step="1"
              className={INPUT_CLASSES}
              value={form.possePct ?? ""}
              onChange={handleNumberChange("possePct")}
              placeholder="Ex.: 40"
            />
          </FormField>

          <FormField label={t.form.representacao}>
            <input
              className={INPUT_CLASSES}
              value={(form as any).representacao ?? ""}
              onChange={handleTextChange("representacao")}
              placeholder="Ex.: RSF"
            />
          </FormField>

          <FormField label={t.form.contratoInicio}>
            <input
              type="date"
              className={INPUT_CLASSES}
              value={(form as any).contratoInicio ? (form as any).contratoInicio.slice(0, 10) : ""}
              onChange={(e) => {
                const v = e.target.value;
                updateField("contratoInicio", v ? new Date(v + "T00:00:00").toISOString() : null);
              }}
            />
          </FormField>

          <FormField label={t.form.contratoFim}>
            <div className="space-y-2">
              <input
                type="date"
                className={INPUT_CLASSES + ((form as any)._contratoVigente ? " opacity-50" : "")}
                value={(form as any).contratoFim ? (form as any).contratoFim.slice(0, 10) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  updateField("contratoFim", v ? new Date(v + "T00:00:00").toISOString() : null);
                }}
                disabled={!!(form as any)._contratoVigente}
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(form as any)._contratoVigente}
                  onChange={(e) => {
                    updateField("_contratoVigente", e.target.checked);
                    if (e.target.checked) updateField("contratoFim", null);
                  }}
                  className="accent-[#003399]"
                />
                {t.form.contratoVigente}
              </label>
            </div>
          </FormField>

          <FormField label={t.form.numeroCamisa}>
            <input
              type="number"
              className={INPUT_CLASSES}
              value={form.numeroCamisa ?? ""}
              onChange={handleNumberChange("numeroCamisa")}
              placeholder="Ex.: 9"
            />
          </FormField>

          <FormField label={t.form.altura}>
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

      <AdminSectionCard title={t.form.dadosComplementares}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FormField label={t.form.cidade}>
            <input
              className={INPUT_CLASSES}
              value={form.cidade ?? ""}
              onChange={handleTextChange("cidade")}
              placeholder="Ex.: Rio de Janeiro"
            />
          </FormField>

          <FormField label={t.form.nacionalidade}>
            <input
              className={INPUT_CLASSES}
              value={form.nacionalidade ?? ""}
              onChange={handleTextChange("nacionalidade")}
              placeholder="Ex.: Brasil"
            />
          </FormField>
        </div>

        <FormField label={t.form.observacoes}>
          <textarea
            rows={3}
            className={INPUT_CLASSES + " resize-none"}
            value={form.racionalProspecao ?? (form as any).observacoes ?? ""}
            onChange={(e) => updateField("racionalProspecao", e.target.value)}
            placeholder="Resumo rápido do porquê esse atleta é interessante para o Serrano."
          />
        </FormField>
      </AdminSectionCard>

      <AdminSectionCard title={t.form.midiaRedes}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label={t.form.fotoJogador}>
            <ImageUploadButton
              valueUrl={form.imagemUrl ?? ""}
              onUploaded={({ secureUrl }) => updateField("imagemUrl", secureUrl)}
              onClear={() => updateField("imagemUrl", "")}
            />
          </FormField>

          <FormField label={t.form.urlVideo}>
            <input
              className={INPUT_CLASSES}
              value={form.videoUrl ?? ""}
              onChange={handleTextChange("videoUrl")}
              placeholder="https://youtube.com/..."
            />
          </FormField>

          <FormField label={t.form.instagram}>
            <input
              className={INPUT_CLASSES}
              value={form.instagramHandle ?? ""}
              onChange={handleTextChange("instagramHandle")}
              placeholder="@jogador10"
            />
          </FormField>

          <FormField label={t.form.xTwitter}>
            <input
              className={INPUT_CLASSES}
              value={form.xUrl ?? ""}
              onChange={handleTextChange("xUrl")}
              placeholder="https://x.com/..."
            />
          </FormField>

          <FormField label={t.form.youtubeUrl}>
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
          {t.form.estatisticas}
        </h2>
        <p className="text-xs text-gray-500">
          {t.form.estatisticasDesc}
        </p>

        <div className="space-y-3">
          {Object.entries(
            (form.statsPorTemporada ?? {}) as Record<string, SeasonStats>
          ).map(([seasonKey, st]) => (
            <div
              key={seasonKey}
              className="grid grid-cols-1 gap-2 md:grid-cols-[90px_repeat(3,minmax(0,1fr))_auto] items-end"
            >
              <FormField label={t.form.temporada}>
                <input className="input" value={seasonKey} readOnly />
              </FormField>

              <FormField label={t.form.gols}>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={st.gols ?? ""}
                  onChange={handleStatsFieldChange(seasonKey, "gols")}
                />
              </FormField>

              <FormField label={t.form.assistencias}>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={st.assistencias ?? ""}
                  onChange={handleStatsFieldChange(seasonKey, "assistencias")}
                />
              </FormField>

              <FormField label={t.form.partidas}>
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
                {t.form.remover}
              </button>
            </div>
          ))}

          {statsCount === 0 && (
            <p className="text-xs text-gray-500">
              {t.form.nenhumaTemporada}
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[160px_auto] items-end">
          <FormField label={t.form.novaTemporada}>
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
            {t.form.adicionarTemporada}
          </button>
        </div>
      </div>

      <AdminSectionCard title={t.form.passaporteSelecao}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label={t.form.passaporteEuropeu}>
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
              <option value="">{t.form.naoInformado}</option>
              <option value="true">{t.form.sim}</option>
              <option value="false">{t.form.nao}</option>
            </select>
          </FormField>

          <FormField label={t.form.paisPassaporte}>
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

          <FormField label={t.form.convocadoSelecao}>
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
              <option value="">{t.form.naoInformado}</option>
              <option value="true">{t.form.sim}</option>
              <option value="false">{t.form.nao}</option>
            </select>
          </FormField>

          <FormField label={t.form.anosConvocacao}>
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

          <FormField label={t.form.categoria}>
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
          {cancelLabel ?? t.form.cancelar}
        </button>

        <button
          type="submit"
          disabled={!!saving}
          className="rounded-lg bg-[#f2d249] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? t.form.salvando : submitLabel}
        </button>
      </div>
    </form>
  );
}