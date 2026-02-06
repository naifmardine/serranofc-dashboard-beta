// lib/dashboard/format.ts
import type { KpiDatum } from "@/type/dashboard";

/**
 * PRINCÍPIO
 * - KPI: legibilidade máxima (moeda com 2 casas).
 * - Eixos/labels de gráfico: compactar quando grande (senão estoura layout).
 *
 * Você pode usar:
 * - formatCurrency(...) => KPI e tooltip (full)
 * - formatMoneyAxis(...) => ticks de eixo (compact)
 */

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** € 4.000.000,00 (sempre 2 casas) */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = "EUR",
  locale: string = "pt-BR",
  fractionDigits: number = 2,
) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

/** 1.234 (inteiro por padrão) */
export function formatNumber(
  value: number | null | undefined,
  locale: string = "pt-BR",
  fractionDigits: number = 0,
) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

/** 12,3% (1 casa por padrão) */
export function formatPercent(
  value: number | null | undefined,
  locale: string = "pt-BR",
  fractionDigits: number = 1,
) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDateShort(
  iso: string | null | undefined,
  locale: string = "pt-BR",
) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale);
}

/**
 * Compacto genérico (1,2M)
 * Bom pra "raw" e números grandes em cards pequenos.
 */
export function formatCompact(
  value: number | null | undefined,
  locale: string = "pt-BR",
  fractionDigits: number = 1,
) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Dinheiro compacto PARA EIXO (não para KPI)
 * Ex: €4,2M / €850k
 */
export function formatMoneyAxis(
  value: number | null | undefined,
  currency: string = "EUR",
  locale: string = "pt-BR",
  fractionDigits: number = 1,
) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  // Intl com compact + currency funciona bem e evita "€ 4.000.000,00" no eixo
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Decide automaticamente um formato pra KPI com base em unit.
 * Regra:
 * - moeda => FULL com ,00
 * - % => percent
 * - default => number (inteiro)
 */
export function formatKpiValue(kpi: KpiDatum, locale: string = "pt-BR") {
  const v = kpi.value;
  if (!isValidNumber(v)) return "—";

  if (kpi.unit === "EUR") return formatCurrency(v, "EUR", locale, 2);
  if (kpi.unit === "BRL") return formatCurrency(v, "BRL", locale, 2);
  if (kpi.unit === "%") return formatPercent(v, locale, 1);

  // fallback: número "normal" (inteiro) – bom pra contagem/idade
  return formatNumber(v, locale, 0);
}

/**
 * Helper para bins de histograma (idade/fee) com edge-case safe.
 */
export function makeRangeLabel(
  min: number,
  max: number,
  inclusiveLast = false,
) {
  if (inclusiveLast) return `${min}–${max}`;
  return `${min}–${max - 1}`;
}

/**
 * Sanitiza strings (para labels de gráfico) sem quebrar UI.
 */
export function safeLabel(input: unknown, fallback = "Não informado") {
  if (typeof input !== "string") return fallback;
  const t = input.trim();
  return t.length ? t : fallback;
}
