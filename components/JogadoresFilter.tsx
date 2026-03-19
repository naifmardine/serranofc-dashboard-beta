"use client";

import { useEffect, useMemo, useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import type { Jogador } from "@/type/jogador";

import MultiSelectSearch from "@/components/Atoms/filter/MultiSelectSearch";
import Pill from "@/components/Atoms/filter/Pill";
import {
  PrimaryBlueButton,
  SecondaryBlueButton,
} from "@/components/Atoms/filter/Buttons";

import {
  cx,
  buildFilterOptions,
  clampNum,
  formatMilhoes,
  moneyEURfromMilhoes,
  parsePtNumber,
  NONE_AGENCY,
  SERRANO_BLUE,
  SERRANO_YELLOW,
  type JogadoresFilters,
} from "@/components/Atoms/filter/utils";

type YesNo = "sim" | "nao";
type CpfMode = "tem" | "nao_tem";

export default function JogadoresFilter({
  open,
  onOpenChange,
  jogadores,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jogadores: Jogador[];
  value: JogadoresFilters;
  onChange: (v: JogadoresFilters) => void;
}) {
  const options = useMemo(() => buildFilterOptions(jogadores), [jogadores]);

  const [draft, setDraft] = useState<JogadoresFilters>(() => ({
    ...value,
    ageMode: value.ageMode ?? "idade",
    valorSemDefinicao: value.valorSemDefinicao ?? false,
    posseSemDefinicao: value.posseSemDefinicao ?? false,
    alturaSemDefinicao: value.alturaSemDefinicao ?? false,
  }));

  // inputs
  const [idadeMinTxt, setIdadeMinTxt] = useState("");
  const [idadeMaxTxt, setIdadeMaxTxt] = useState("");
  const [anoMinTxt, setAnoMinTxt] = useState("");
  const [anoMaxTxt, setAnoMaxTxt] = useState("");

  const [valorMinTxt, setValorMinTxt] = useState("");
  const [valorMaxTxt, setValorMaxTxt] = useState("");

  const [posseMinTxt, setPosseMinTxt] = useState("");
  const [posseMaxTxt, setPosseMaxTxt] = useState("");

  const [alturaMinTxt, setAlturaMinTxt] = useState("");
  const [alturaMaxTxt, setAlturaMaxTxt] = useState("");

  const [idadeErr, setIdadeErr] = useState<string | null>(null);
  const [anoErr, setAnoErr] = useState<string | null>(null);
  const [valorErr, setValorErr] = useState<string | null>(null);
  const [posseErr, setPosseErr] = useState<string | null>(null);
  const [alturaErr, setAlturaErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const next: JogadoresFilters = {
      ...value,
      ageMode: value.ageMode ?? "idade",
      valorSemDefinicao: value.valorSemDefinicao ?? false,
      posseSemDefinicao: value.posseSemDefinicao ?? false,
      alturaSemDefinicao: value.alturaSemDefinicao ?? false,
    };

    setDraft(next);

    setIdadeMinTxt(next.idadeMin === undefined ? "" : String(next.idadeMin));
    setIdadeMaxTxt(next.idadeMax === undefined ? "" : String(next.idadeMax));

    setAnoMinTxt(
      next.anoNascimentoMin === undefined ? "" : String(next.anoNascimentoMin),
    );
    setAnoMaxTxt(
      next.anoNascimentoMax === undefined ? "" : String(next.anoNascimentoMax),
    );

    setValorMinTxt(next.valorMin === undefined ? "" : formatMilhoes(next.valorMin));
    setValorMaxTxt(next.valorMax === undefined ? "" : formatMilhoes(next.valorMax));

    setPosseMinTxt(next.posseMin === undefined ? "" : String(next.posseMin));
    setPosseMaxTxt(next.posseMax === undefined ? "" : String(next.posseMax));

    setAlturaMinTxt(next.alturaMin === undefined ? "" : String(next.alturaMin));
    setAlturaMaxTxt(next.alturaMax === undefined ? "" : String(next.alturaMax));

    setIdadeErr(null);
    setAnoErr(null);
    setValorErr(null);
    setPosseErr(null);
    setAlturaErr(null);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const setAgeMode = (mode: "idade" | "anoNascimento") => {
    setDraft((prev) => ({
      ...prev,
      ageMode: mode,
      ...(mode === "idade"
        ? { anoNascimentoMin: undefined, anoNascimentoMax: undefined }
        : { idadeMin: undefined, idadeMax: undefined }),
    }));
    setIdadeErr(null);
    setAnoErr(null);
  };

  const toggleArr = (key: keyof JogadoresFilters, item: string) => {
    setDraft((prev) => {
      const arr = (prev[key] as string[]) ?? [];
      const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
      return { ...prev, [key]: next };
    });
  };

  const setCpfMode = (mode?: CpfMode) => {
    setDraft((prev) => ({ ...prev, cpfCadastrado: prev.cpfCadastrado === mode ? undefined : mode }));
  };

  const setYesNo = (key: "passaporteEuropeu" | "convocadoSelecao", v?: YesNo) => {
    setDraft((prev) => ({
      ...prev,
      [key]: (prev as any)[key] === v ? undefined : v,
    }));
  };

  /* ========================= normalizers ========================= */

  const normalizeAgeFromText = () => {
    const hardMin = options.idadeMin ?? 0;
    const hardMax = options.idadeMax ?? 0;

    let error: string | null = null;

    const minRaw = parsePtNumber(idadeMinTxt);
    const maxRaw = parsePtNumber(idadeMaxTxt);

    if (idadeMinTxt.trim() && minRaw === null) error = "Idade mínima inválida.";
    if (idadeMaxTxt.trim() && maxRaw === null) error = "Idade máxima inválida.";

    let min = minRaw === null ? undefined : Math.trunc(minRaw);
    let max = maxRaw === null ? undefined : Math.trunc(maxRaw);

    if (min !== undefined) min = clampNum(min, hardMin, hardMax);
    if (max !== undefined) max = clampNum(max, hardMin, hardMax);
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

    setIdadeErr(error);
    setIdadeMinTxt(min === undefined ? "" : String(min));
    setIdadeMaxTxt(max === undefined ? "" : String(max));
    setDraft((prev) => ({ ...prev, idadeMin: min, idadeMax: max }));

    return { min, max, error };
  };

  const normalizeAnoFromText = () => {
    const hardMin = options.anoMin ?? 0;
    const hardMax = options.anoMax ?? 0;

    let error: string | null = null;

    const minRaw = parsePtNumber(anoMinTxt);
    const maxRaw = parsePtNumber(anoMaxTxt);

    if (anoMinTxt.trim() && minRaw === null) error = "Ano mínimo inválido.";
    if (anoMaxTxt.trim() && maxRaw === null) error = "Ano máximo inválido.";

    let min = minRaw === null ? undefined : Math.trunc(minRaw);
    let max = maxRaw === null ? undefined : Math.trunc(maxRaw);

    if (hardMin && hardMax) {
      if (min !== undefined) min = clampNum(min, hardMin, hardMax);
      if (max !== undefined) max = clampNum(max, hardMin, hardMax);
    }

    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

    setAnoErr(error);
    setAnoMinTxt(min === undefined ? "" : String(min));
    setAnoMaxTxt(max === undefined ? "" : String(max));
    setDraft((prev) => ({ ...prev, anoNascimentoMin: min, anoNascimentoMax: max }));

    return { min, max, error };
  };

  const normalizeValorFromText = () => {
    const hardMin = options.valorMin ?? 0;
    const hardMax = options.valorMax ?? 0;

    let error: string | null = null;

    const minRaw = parsePtNumber(valorMinTxt);
    const maxRaw = parsePtNumber(valorMaxTxt);

    if (valorMinTxt.trim() && minRaw === null) error = "Valor mínimo inválido. Ex: 2,5";
    if (valorMaxTxt.trim() && maxRaw === null) error = "Valor máximo inválido. Ex: 10";

    let min = minRaw === null ? undefined : minRaw;
    let max = maxRaw === null ? undefined : maxRaw;

    if (min !== undefined) min = clampNum(min, hardMin, hardMax);
    if (max !== undefined) max = clampNum(max, hardMin, hardMax);
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

    if (min !== undefined) min = Math.round(min * 100) / 100;
    if (max !== undefined) max = Math.round(max * 100) / 100;

    setValorErr(error);
    setValorMinTxt(min === undefined ? "" : formatMilhoes(min));
    setValorMaxTxt(max === undefined ? "" : formatMilhoes(max));
    setDraft((prev) => ({ ...prev, valorMin: min, valorMax: max }));

    return { min, max, error };
  };

  const normalizePosseFromText = () => {
    const hardMin = options.posseMin ?? 0;
    const hardMax = options.posseMax ?? 100;

    let error: string | null = null;

    const minRaw = parsePtNumber(posseMinTxt);
    const maxRaw = parsePtNumber(posseMaxTxt);

    if (posseMinTxt.trim() && minRaw === null) error = "% Serrano mínimo inválido.";
    if (posseMaxTxt.trim() && maxRaw === null) error = "% Serrano máximo inválido.";

    let min = minRaw === null ? undefined : Math.trunc(minRaw);
    let max = maxRaw === null ? undefined : Math.trunc(maxRaw);

    if (min !== undefined) min = clampNum(min, hardMin, hardMax);
    if (max !== undefined) max = clampNum(max, hardMin, hardMax);
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

    setPosseErr(error);
    setPosseMinTxt(min === undefined ? "" : String(min));
    setPosseMaxTxt(max === undefined ? "" : String(max));
    setDraft((prev) => ({ ...prev, posseMin: min, posseMax: max }));

    return { min, max, error };
  };

  const normalizeAlturaFromText = () => {
    const hardMin = options.alturaMin ?? 0;
    const hardMax = options.alturaMax ?? 0;

    let error: string | null = null;

    const minRaw = parsePtNumber(alturaMinTxt);
    const maxRaw = parsePtNumber(alturaMaxTxt);

    if (alturaMinTxt.trim() && minRaw === null) error = "Altura mínima inválida.";
    if (alturaMaxTxt.trim() && maxRaw === null) error = "Altura máxima inválida.";

    let min = minRaw === null ? undefined : Math.trunc(minRaw);
    let max = maxRaw === null ? undefined : Math.trunc(maxRaw);

    if (hardMin && hardMax) {
      if (min !== undefined) min = clampNum(min, hardMin, hardMax);
      if (max !== undefined) max = clampNum(max, hardMin, hardMax);
    }

    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

    setAlturaErr(error);
    setAlturaMinTxt(min === undefined ? "" : String(min));
    setAlturaMaxTxt(max === undefined ? "" : String(max));
    setDraft((prev) => ({ ...prev, alturaMin: min, alturaMax: max }));

    return { min, max, error };
  };

  const toggleValorSemDefinicao = () => {
    setDraft((prev) => {
      const next = !(prev.valorSemDefinicao ?? false);

      if (next) {
        setValorMinTxt("");
        setValorMaxTxt("");
        setValorErr(null);
        return {
          ...prev,
          valorSemDefinicao: true,
          valorMin: undefined,
          valorMax: undefined,
        };
      }

      return { ...prev, valorSemDefinicao: false };
    });
  };

  const togglePosseSemDefinicao = () => {
    setDraft((prev) => {
      const next = !(prev.posseSemDefinicao ?? false);

      if (next) {
        setPosseMinTxt("");
        setPosseMaxTxt("");
        setPosseErr(null);
        return {
          ...prev,
          posseSemDefinicao: true,
          posseMin: undefined,
          posseMax: undefined,
        };
      }

      return { ...prev, posseSemDefinicao: false };
    });
  };

  const toggleAlturaSemDefinicao = () => {
    setDraft((prev) => {
      const next = !(prev.alturaSemDefinicao ?? false);

      if (next) {
        setAlturaMinTxt("");
        setAlturaMaxTxt("");
        setAlturaErr(null);
        return {
          ...prev,
          alturaSemDefinicao: true,
          alturaMin: undefined,
          alturaMax: undefined,
        };
      }

      return { ...prev, alturaSemDefinicao: false };
    });
  };

  const clearAll = () => {
    setDraft({
      clubes: [],
      agencias: [],
      posicoes: [],
      peDominante: [],

      ageMode: "idade",
      idadeMin: undefined,
      idadeMax: undefined,
      anoNascimentoMin: undefined,
      anoNascimentoMax: undefined,

      valorMin: undefined,
      valorMax: undefined,
      valorSemDefinicao: false,

      posseMin: undefined,
      posseMax: undefined,
      posseSemDefinicao: false,

      alturaMin: undefined,
      alturaMax: undefined,
      alturaSemDefinicao: false,

      cpfCadastrado: undefined,
      passaporteEuropeu: undefined,
      convocadoSelecao: undefined,
    });

    setIdadeMinTxt("");
    setIdadeMaxTxt("");
    setAnoMinTxt("");
    setAnoMaxTxt("");

    setValorMinTxt("");
    setValorMaxTxt("");

    setPosseMinTxt("");
    setPosseMaxTxt("");

    setAlturaMinTxt("");
    setAlturaMaxTxt("");

    setIdadeErr(null);
    setAnoErr(null);
    setValorErr(null);
    setPosseErr(null);
    setAlturaErr(null);
  };

  const apply = () => {
    const mode = draft.ageMode ?? "idade";

    const age =
      mode === "idade"
        ? normalizeAgeFromText()
        : { min: undefined, max: undefined, error: null };

    const by =
      mode === "anoNascimento"
        ? normalizeAnoFromText()
        : { min: undefined, max: undefined, error: null };

    const val = draft.valorSemDefinicao
      ? { min: undefined, max: undefined, error: null }
      : normalizeValorFromText();

    const pos = draft.posseSemDefinicao
      ? { min: undefined, max: undefined, error: null }
      : normalizePosseFromText();

    const alt = draft.alturaSemDefinicao
      ? { min: undefined, max: undefined, error: null }
      : normalizeAlturaFromText();

    const nextDraft: JogadoresFilters = {
      ...draft,
      ageMode: mode,

      idadeMin: mode === "idade" ? age.min : undefined,
      idadeMax: mode === "idade" ? age.max : undefined,

      anoNascimentoMin: mode === "anoNascimento" ? by.min : undefined,
      anoNascimentoMax: mode === "anoNascimento" ? by.max : undefined,

      valorMin: draft.valorSemDefinicao ? undefined : val.min,
      valorMax: draft.valorSemDefinicao ? undefined : val.max,

      posseMin: draft.posseSemDefinicao ? undefined : pos.min,
      posseMax: draft.posseSemDefinicao ? undefined : pos.max,

      alturaMin: draft.alturaSemDefinicao ? undefined : alt.min,
      alturaMax: draft.alturaSemDefinicao ? undefined : alt.max,
    };

    onChange(nextDraft);
    setDraft(nextDraft);
    onOpenChange(false);
  };

  if (!open) return null;

  const hasNoneAgency = draft.agencias.includes(NONE_AGENCY);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/25"
        onClick={() => onOpenChange(false)}
        aria-label="Fechar filtros"
      />

      <aside
        className={cx(
          "fixed right-0 top-0 z-50 h-full w-[440px] max-w-[94vw]",
          "bg-white shadow-2xl border-l border-slate-100",
          "rounded-l-2xl overflow-hidden",
        )}
      >
        {/* Header */}
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl border"
                style={{
                  backgroundColor: `${SERRANO_BLUE}10`,
                  borderColor: `${SERRANO_BLUE}20`,
                }}
              >
                <SlidersHorizontal size={16} style={{ color: SERRANO_BLUE }} />
              </span>

              <div>
                <div className="text-sm font-extrabold text-slate-900">Filtros</div>
                <div className="text-xs text-slate-500">Refine sua lista de jogadores</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer rounded-xl p-2 hover:bg-slate-50"
              aria-label="Fechar"
              title="Fechar"
            >
              <X size={18} className="text-slate-700" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-132px)] overflow-y-auto px-4 py-4 space-y-5">
          {/* Identidade / Cadastro */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="text-sm font-extrabold text-slate-900">CPF</div>

            <div className="flex flex-wrap gap-2">
              <Pill
                active={draft.cpfCadastrado === "tem"}
                onClick={() => setCpfMode("tem")}
                title="Apenas jogadores com CPF preenchido"
              >
                Cadastrado
              </Pill>
              <Pill
                active={draft.cpfCadastrado === "nao_tem"}
                onClick={() => setCpfMode("nao_tem")}
                title="Apenas jogadores sem CPF preenchido"
              >
                Não Cadastrado
              </Pill>
            </div>
          </div>

          {/* Passaporte / Seleção */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="text-sm font-extrabold text-slate-900">Status</div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Passaporte europeu</div>
              <div className="flex flex-wrap gap-2">
                <Pill
                  active={draft.passaporteEuropeu === "sim"}
                  onClick={() => setYesNo("passaporteEuropeu", "sim")}
                >
                  Sim
                </Pill>
                <Pill
                  active={draft.passaporteEuropeu === "nao"}
                  onClick={() => setYesNo("passaporteEuropeu", "nao")}
                >
                  Não
                </Pill>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Convocado para seleção</div>
              <div className="flex flex-wrap gap-2">
                <Pill
                  active={draft.convocadoSelecao === "sim"}
                  onClick={() => setYesNo("convocadoSelecao", "sim")}
                >
                  Sim
                </Pill>
                <Pill
                  active={draft.convocadoSelecao === "nao"}
                  onClick={() => setYesNo("convocadoSelecao", "nao")}
                >
                  Não
                </Pill>
              </div>
            </div>
          </div>

          {/* Faixa: idade / ano nasc */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">Faixa</div>

              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setAgeMode("idade")}
                  className={cx(
                    "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-extrabold transition",
                    (draft.ageMode ?? "idade") === "idade"
                      ? "text-black"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                  style={
                    (draft.ageMode ?? "idade") === "idade"
                      ? { backgroundColor: SERRANO_YELLOW }
                      : undefined
                  }
                >
                  Idade
                </button>

                <button
                  type="button"
                  onClick={() => setAgeMode("anoNascimento")}
                  className={cx(
                    "cursor-pointer rounded-xl px-3 py-1.5 text-xs font-extrabold transition",
                    (draft.ageMode ?? "idade") === "anoNascimento"
                      ? "text-black"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                  style={
                    (draft.ageMode ?? "idade") === "anoNascimento"
                      ? { backgroundColor: SERRANO_YELLOW }
                      : undefined
                  }
                >
                  Ano Nasc.
                </button>
              </div>
            </div>

            {(draft.ageMode ?? "idade") === "idade" ? (
              <>
                <div className="mb-3 text-xs text-slate-500">
                  Range:{" "}
                  <span className="font-extrabold text-slate-700">
                    {options.idadeMin}–{options.idadeMax}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-600">
                    Min
                    <input
                      inputMode="numeric"
                      value={idadeMinTxt}
                      onChange={(e) => setIdadeMinTxt(e.target.value)}
                      onBlur={normalizeAgeFromText}
                      placeholder={String(options.idadeMin)}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  <label className="text-xs text-slate-600">
                    Max
                    <input
                      inputMode="numeric"
                      value={idadeMaxTxt}
                      onChange={(e) => setIdadeMaxTxt(e.target.value)}
                      onBlur={normalizeAgeFromText}
                      placeholder={String(options.idadeMax)}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                </div>

                {idadeErr && <div className="mt-2 text-xs text-red-600">{idadeErr}</div>}
              </>
            ) : (
              <>
                <div className="mb-3 text-xs text-slate-500">
                  Range:{" "}
                  <span className="font-extrabold text-slate-700">
                    {options.anoMin || "—"}–{options.anoMax || "—"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-600">
                    Min
                    <input
                      inputMode="numeric"
                      value={anoMinTxt}
                      onChange={(e) => setAnoMinTxt(e.target.value)}
                      onBlur={normalizeAnoFromText}
                      placeholder={options.anoMin ? String(options.anoMin) : "Ex: 2001"}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  <label className="text-xs text-slate-600">
                    Max
                    <input
                      inputMode="numeric"
                      value={anoMaxTxt}
                      onChange={(e) => setAnoMaxTxt(e.target.value)}
                      onBlur={normalizeAnoFromText}
                      placeholder={options.anoMax ? String(options.anoMax) : "Ex: 2007"}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                </div>

                {anoErr && <div className="mt-2 text-xs text-red-600">{anoErr}</div>}
              </>
            )}
          </div>

          {/* Valor de mercado */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">Valor de mercado</div>

              <Pill
                active={!!draft.valorSemDefinicao}
                onClick={toggleValorSemDefinicao}
                title="Filtrar apenas jogadores com valorMercado = 0 ou sem valor"
              >
                Sem valor
              </Pill>
            </div>

            <div className="mb-3 text-xs text-slate-500">
              Unidade: <span className="font-extrabold text-slate-700">milhões (EUR)</span>{" "}
              — ex: <span className="font-extrabold text-slate-700">2,5</span> ={" "}
              <span className="font-extrabold text-slate-700">
                {moneyEURfromMilhoes(2.5)}
              </span>
            </div>

            <div className={cx("grid grid-cols-2 gap-2", draft.valorSemDefinicao && "opacity-60")}>
              <label className="text-xs text-slate-600">
                Min (mi)
                <input
                  disabled={!!draft.valorSemDefinicao}
                  inputMode="decimal"
                  value={valorMinTxt}
                  onChange={(e) => setValorMinTxt(e.target.value)}
                  onBlur={normalizeValorFromText}
                  placeholder={options.valorMin ? formatMilhoes(options.valorMin) : "0"}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </label>

              <label className="text-xs text-slate-600">
                Max (mi)
                <input
                  disabled={!!draft.valorSemDefinicao}
                  inputMode="decimal"
                  value={valorMaxTxt}
                  onChange={(e) => setValorMaxTxt(e.target.value)}
                  onBlur={normalizeValorFromText}
                  placeholder={options.valorMax ? formatMilhoes(options.valorMax) : "0"}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </label>
            </div>

            {!draft.valorSemDefinicao && valorErr && (
              <div className="mt-2 text-xs text-red-600">{valorErr}</div>
            )}
          </div>

          {/* % Serrano */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">% Serrano</div>

              <Pill
                active={!!draft.posseSemDefinicao}
                onClick={togglePosseSemDefinicao}
                title="Filtrar apenas jogadores sem posse (% Serrano) cadastrada"
              >
                Sem posse
              </Pill>
            </div>

            <div className="mb-3 text-xs text-slate-500">
              Unidade: <span className="font-extrabold text-slate-700">%</span> — range típico{" "}
              <span className="font-extrabold text-slate-700">
                {options.posseMin ?? 0}–{options.posseMax ?? 100}
              </span>
            </div>

            <div className={cx("grid grid-cols-2 gap-2", draft.posseSemDefinicao && "opacity-60")}>
              <label className="text-xs text-slate-600">
                Min (%)
                <input
                  disabled={!!draft.posseSemDefinicao}
                  inputMode="numeric"
                  value={posseMinTxt}
                  onChange={(e) => setPosseMinTxt(e.target.value)}
                  onBlur={normalizePosseFromText}
                  placeholder={String(options.posseMin ?? 0)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </label>

              <label className="text-xs text-slate-600">
                Max (%)
                <input
                  disabled={!!draft.posseSemDefinicao}
                  inputMode="numeric"
                  value={posseMaxTxt}
                  onChange={(e) => setPosseMaxTxt(e.target.value)}
                  onBlur={normalizePosseFromText}
                  placeholder={String(options.posseMax ?? 100)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </label>
            </div>

            {!draft.posseSemDefinicao && posseErr && (
              <div className="mt-2 text-xs text-red-600">{posseErr}</div>
            )}
          </div>

          {/* Altura */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">Altura</div>

              <Pill
                active={!!draft.alturaSemDefinicao}
                onClick={toggleAlturaSemDefinicao}
                title="Filtrar apenas jogadores sem altura cadastrada"
              >
                Sem altura
              </Pill>
            </div>

            <div className="mb-3 text-xs text-slate-500">
              Unidade: <span className="font-extrabold text-slate-700">cm</span>{" "}
              {options.alturaMin && options.alturaMax ? (
                <>
                  — range{" "}
                  <span className="font-extrabold text-slate-700">
                    {options.alturaMin}–{options.alturaMax}
                  </span>
                </>
              ) : null}
            </div>

            <div className={cx("grid grid-cols-2 gap-2", draft.alturaSemDefinicao && "opacity-60")}>
              <label className="text-xs text-slate-600">
                Min (cm)
                <input
                  disabled={!!draft.alturaSemDefinicao}
                  inputMode="numeric"
                  value={alturaMinTxt}
                  onChange={(e) => setAlturaMinTxt(e.target.value)}
                  onBlur={normalizeAlturaFromText}
                  placeholder={options.alturaMin ? String(options.alturaMin) : "Ex: 170"}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </label>

              <label className="text-xs text-slate-600">
                Max (cm)
                <input
                  disabled={!!draft.alturaSemDefinicao}
                  inputMode="numeric"
                  value={alturaMaxTxt}
                  onChange={(e) => setAlturaMaxTxt(e.target.value)}
                  onBlur={normalizeAlturaFromText}
                  placeholder={options.alturaMax ? String(options.alturaMax) : "Ex: 195"}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                />
              </label>
            </div>

            {!draft.alturaSemDefinicao && alturaErr && (
              <div className="mt-2 text-xs text-red-600">{alturaErr}</div>
            )}
          </div>

          {/* Posição */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-extrabold text-slate-900">Posição</div>
            <div className="flex flex-wrap gap-2">
              {options.posicoes.slice(0, 60).map((p) => (
                <Pill
                  key={p || "—"}
                  active={draft.posicoes.includes(p)}
                  onClick={() => toggleArr("posicoes", p)}
                  title={p}
                >
                  {p || "—"}
                </Pill>
              ))}
            </div>
          </div>

          {/* Clube */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <MultiSelectSearch
              label="Clube"
              placeholder="Buscar clube…"
              options={options.clubesRich}
              selected={draft.clubes}
              onChange={(next) => setDraft((prev) => ({ ...prev, clubes: next }))}
              emptyLabel="Nenhum clube encontrado"
              renderOption={(opt, active) => (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full border border-slate-200 bg-white overflow-hidden grid place-items-center shrink-0">
                      {opt.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={opt.logoUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-100" />
                      )}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>

                  <span
                    className={cx(
                      "text-xs font-extrabold",
                      active ? "text-slate-900" : "text-slate-400",
                    )}
                  >
                    {active ? "Selecionado" : ""}
                  </span>
                </div>
              )}
            />
          </div>

          {/* Agência */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">Agência</div>

              <Pill
                active={hasNoneAgency}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    agencias: prev.agencias.includes(NONE_AGENCY)
                      ? prev.agencias.filter((x) => x !== NONE_AGENCY)
                      : [...prev.agencias, NONE_AGENCY],
                  }))
                }
              >
                Sem agência
              </Pill>
            </div>

            <MultiSelectSearch
              label=""
              placeholder="Buscar agência…"
              options={options.agencias}
              selected={draft.agencias.filter((x) => x !== NONE_AGENCY)}
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  agencias: [...next, ...(prev.agencias.includes(NONE_AGENCY) ? [NONE_AGENCY] : [])],
                }))
              }
              emptyLabel="Nenhuma agência encontrada"
            />
          </div>

          {/* Pé dominante */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-extrabold text-slate-900">Pé dominante</div>
            <div className="flex gap-2">
              {[
                { key: "D", label: "Direito" },
                { key: "E", label: "Esquerdo" },
              ].map((p) => (
                <Pill
                  key={p.key}
                  active={draft.peDominante.includes(p.key)}
                  onClick={() => toggleArr("peDominante", p.key)}
                >
                  {p.label}
                </Pill>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-4 flex items-center justify-between gap-2 bg-white">
          <SecondaryBlueButton onClick={clearAll}>Limpar tudo</SecondaryBlueButton>
          <PrimaryBlueButton onClick={apply}>Aplicar</PrimaryBlueButton>
        </div>

        <style jsx>{`
          aside {
            animation: slideIn 160ms ease-out;
          }
          @keyframes slideIn {
            from {
              transform: translateX(12px);
              opacity: 0.7;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>
      </aside>
    </>
  );
}