// components/GeoMapWidget/geoAdapters.ts

export type ContinentCode = "SA" | "NA" | "EU" | "AF" | "AS" | "OC";
export type Mode = "WORLD" | ContinentCode | "BR";

// -------------------------
//  MAP DATA (JSON importado)
// -------------------------
import worldContinents from "public/maps/world-continents.json";

import africa from "public/maps/continents/africa.json";
import asia from "public/maps/continents/asia.json";
import europe from "public/maps/continents/europe.json";
import northAmerica from "public/maps/continents/north-america.json";
import oceania from "public/maps/continents/oceania.json";
import southAmerica from "public/maps/continents/south-america.json";

import brStates from "public/maps/brazil/br-states.json";

export const MAP_DATA: Record<Mode, any> = {
  WORLD: worldContinents,

  SA: southAmerica,
  NA: northAmerica,
  EU: europe,
  AF: africa,
  AS: asia,
  OC: oceania,

  BR: brStates,
};

// -------------------------
// utils
// -------------------------
export function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Converte nome de país (do mapa) -> ISO2 usando sua whitelist (COUNTRY_OPTIONS).
 * Você deve passar a lista COUNTRY_OPTIONS aqui no index.tsx.
 */
export function buildNameToISO2(
  countryOptions: Array<{ code: string; name: string }>,
) {
  const m = new Map<string, string>();

  for (const c of countryOptions) {
    m.set(norm(c.name), c.code.toUpperCase());
    // aliases comuns (inglês do dataset -> ISO2)
    m.set(norm("Brazil"), "BR");
    m.set(norm("Brasil"), "BR");

    m.set(norm("Croatia"), "HR");
    m.set(norm("Hrvatska"), "HR"); // às vezes aparece assim

    // (opcional, mas recomendo)
    m.set(norm("Bolivia"), "BO");
    m.set(norm("Venezuela"), "VE");
    m.set(norm("Peru"), "PE");
    m.set(norm("Colombia"), "CO");
    m.set(norm("Ecuador"), "EC");

    m.set(norm("Portugal"), "PT");
    m.set(norm("Spain"), "ES");
    m.set(norm("Germany"), "DE");
    m.set(norm("France"), "FR");
    m.set(norm("Italy"), "IT");
    m.set(norm("United Kingdom"), "GB");
    m.set(norm("Netherlands"), "NL");
    m.set(norm("Switzerland"), "CH");
    m.set(norm("Austria"), "AT");
  }

  // aliases comuns
  m.set(norm("United States of America"), "US");
  m.set(norm("United States"), "US");
  m.set(norm("Russia"), "RU");
  m.set(norm("Czech Republic"), "CZ");
  m.set(norm("Republic of Korea"), "KR");
  m.set(norm("South Korea"), "KR");
  m.set(norm("North Macedonia"), "MK");
  m.set(norm("Viet Nam"), "VN");

  // alguns datasets usam nomes “políticos”
  m.set(norm("Bolivia (Plurinational State of)"), "BO");
  m.set(norm("Venezuela (Bolivarian Republic of)"), "VE");
  m.set(norm("Iran (Islamic Republic of)"), "IR");
  m.set(norm("Syrian Arab Republic"), "SY");
  m.set(norm("Lao People's Democratic Republic"), "LA");

  return m;
}

/**
 * WORLD (continentes): pega o continente do geo.
 * No teu dataset world-continents, aparece:
 *   properties: { continent: "South America" }
 * Também pode aparecer name/NAME.
 */
export function getContinentCodeFromGeo(geo: any): ContinentCode | "" {
  const p = geo?.properties ?? {};

  const raw = safeStr(
    p.continent ??
      p.CONTINENT ??
      p.name ??
      p.NAME ??
      p.region ??
      p.REGION ??
      "",
  );

  const n = norm(raw);
  if (!n) return "";

  if (n.includes("south america")) return "SA";
  if (n.includes("north america")) return "NA";
  if (n.includes("europe")) return "EU";
  if (n.includes("africa")) return "AF";
  if (n.includes("asia")) return "AS";
  if (n.includes("oceania") || n.includes("australia")) return "OC";

  return "";
}

/**
 * CONTINENTE (países): tenta extrair ISO2 do dataset (se existir).
 * Se não existir (ex: oceania-lite com geounit), cai pro name/geounit/admin e usa nameToISO2.
 */
export function getISO2FromCountryGeo(
  geo: any,
  nameToISO2: Map<string, string>,
): string {
  const p = geo?.properties ?? {};

  const iso2 = safeStr(
    p["ISO3166-1-Alpha-2"] ??
      p.ISO_A2 ??
      p.iso_a2 ??
      p["iso_a2"] ??
      p.ISO2 ??
      p.iso2 ??
      "",
  ).toUpperCase();

  if (iso2 && iso2 !== "-99" && iso2 !== "ZZ") return iso2;

  const candidate = safeStr(
    p.geounit ?? p.name ?? p.NAME ?? p.ADMIN ?? p.admin ?? "",
  );

  const hit = nameToISO2.get(norm(candidate));
  return hit ?? "";
}

export function getCountryLabel(geo: any): string {
  const p = geo?.properties ?? {};
  const raw = safeStr(p.geounit ?? p.name ?? p.NAME ?? p.ADMIN ?? p.admin ?? "");

  const n = raw.toLowerCase();
  if (n === "brazil") return "Brasil";
  return raw;
}


export function getUFfromBRGeo(geo: any): string {
  const p = geo?.properties ?? {};
  return safeStr(p.sigla || p.UF || p.uf || p.postal || "").toUpperCase();
}

export function getStateLabel(geo: any): string {
  const p = geo?.properties ?? {};
  return safeStr(p.nome ?? p.NAME ?? p.name ?? "");
}
