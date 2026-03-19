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

// -------------------------
//  OPTIONS (fonte de nomes PT)
// -------------------------
import { COUNTRY_OPTIONS, BR_STATES } from "@/lib/dashboard/geoOptions";

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

// -------------------------
// lookups (maps rápidos)
// -------------------------
export function buildISO2ToName(
  countryOptions: Array<{ code: string; name: string }>,
) {
  const m = new Map<string, string>();
  for (const c of countryOptions) m.set(c.code.toUpperCase(), c.name);
  return m;
}

export function buildUFToName(
  stateOptions: Array<{ code: string; name: string }>,
) {
  const m = new Map<string, string>();
  for (const s of stateOptions) m.set(s.code.toUpperCase(), s.name);
  return m;
}

export const ISO2_TO_NAME = buildISO2ToName(COUNTRY_OPTIONS);
export const UF_TO_NAME = buildUFToName(BR_STATES);

/**
 * Converte nome de país (do mapa) -> ISO2 usando sua whitelist (COUNTRY_OPTIONS).
 * Você deve passar a lista COUNTRY_OPTIONS aqui no index.tsx.
 */
export function buildNameToISO2(
  countryOptions: Array<{ code: string; name: string }>,
) {
  const m = new Map<string, string>();

  // base: nomes PT -> ISO2
  for (const c of countryOptions) {
    m.set(norm(c.name), c.code.toUpperCase());
  }

  // aliases comuns (inglês do dataset -> ISO2)
  m.set(norm("Brazil"), "BR");
  m.set(norm("Brasil"), "BR");

  m.set(norm("Croatia"), "HR");
  m.set(norm("Hrvatska"), "HR");

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

  // =========================
  // ALIASES “pesados” (datasets comuns: Natural Earth etc.)
  // =========================

  // ---- UK / Inglaterra / variantes
  m.set(norm("UK"), "GB");
  m.set(norm("U.K."), "GB");
  m.set(norm("Great Britain"), "GB");
  m.set(norm("Britain"), "GB");
  m.set(norm("United Kingdom"), "GB");
  m.set(norm("United Kingdom of Great Britain and Northern Ireland"), "GB");
  m.set(norm("England"), "GB");
  m.set(norm("Scotland"), "GB");
  m.set(norm("Wales"), "GB");
  m.set(norm("Northern Ireland"), "GB");

  // ---- Czechia
  m.set(norm("Czechia"), "CZ");
  m.set(norm("Czech Republic"), "CZ");
  m.set(norm("Czech Rep."), "CZ");

  // ---- Russia
  m.set(norm("Russian Federation"), "RU");
  m.set(norm("Russia"), "RU");

  // ---- North Macedonia
  m.set(norm("Macedonia"), "MK");
  m.set(norm("Macedonia (FYROM)"), "MK");
  m.set(norm("North Macedonia"), "MK");

  // ---- Bosnia
  m.set(norm("Bosnia and Herzegovina"), "BA");
  m.set(norm("Bosnia-Herzegovina"), "BA");

  // ---- Moldova
  m.set(norm("Moldova"), "MD");
  m.set(norm("Republic of Moldova"), "MD");

  // ---- Belarus / Ukraine
  m.set(norm("Belarus"), "BY");
  m.set(norm("Ukraine"), "UA");

  // ---- Netherlands (Holland)
  m.set(norm("Netherlands"), "NL");
  m.set(norm("The Netherlands"), "NL");
  m.set(norm("Holland"), "NL");

  // ---- Switzerland
  m.set(norm("Switzerland"), "CH");
  m.set(norm("Swiss Confederation"), "CH");

  // ---- Ivory Coast
  m.set(norm("Cote d'Ivoire"), "CI");
  m.set(norm("Côte d'Ivoire"), "CI");
  m.set(norm("Ivory Coast"), "CI");

  // ---- Cape Verde
  m.set(norm("Cape Verde"), "CV");
  m.set(norm("Cabo Verde"), "CV");

  // ---- Eswatini
  m.set(norm("Eswatini"), "SZ");
  m.set(norm("Swaziland"), "SZ");

  // ---- Tanzania
  m.set(norm("Tanzania"), "TZ");
  m.set(norm("United Republic of Tanzania"), "TZ");

  // ---- DR Congo / Congo
  m.set(norm("Democratic Republic of the Congo"), "CD");
  m.set(norm("Dem. Rep. Congo"), "CD");
  m.set(norm("Congo, Dem. Rep."), "CD");
  m.set(norm("Congo (Democratic Republic of the)"), "CD");
  m.set(norm("DR Congo"), "CD");
  m.set(norm("D.R. Congo"), "CD");
  m.set(norm("Congo"), "CG");
  m.set(norm("Republic of the Congo"), "CG");
  m.set(norm("Congo (Republic of the)"), "CG");
  m.set(norm("Congo, Rep."), "CG");

  // ---- Central African Republic
  m.set(norm("Central African Republic"), "CF");

  // ---- Sudan
  m.set(norm("South Sudan"), "SS");
  m.set(norm("Sudan"), "SD");

  // ---- Gambia
  m.set(norm("Gambia"), "GM");
  m.set(norm("The Gambia"), "GM");

  // ---- Guinea variants
  m.set(norm("Equatorial Guinea"), "GQ");
  m.set(norm("Guinea-Bissau"), "GW");
  m.set(norm("Guinea Bissau"), "GW");

  // ---- Sao Tome
  m.set(norm("Sao Tome and Principe"), "ST");
  m.set(norm("São Tomé and Príncipe"), "ST");
  m.set(norm("São Tomé e Príncipe"), "ST");

  // ---- Seychelles / Comoros / Djibouti spellings
  m.set(norm("Seychelles"), "SC");
  m.set(norm("Comoros"), "KM");
  m.set(norm("Djibouti"), "DJ");

  // ---- Türkiye / Turkey
  m.set(norm("Turkey"), "TR");
  m.set(norm("Türkiye"), "TR");

  // ---- Iran / Syria / Laos (political names já cobertos, mas reforço)
  m.set(norm("Iran"), "IR");
  m.set(norm("Syria"), "SY");
  m.set(norm("Laos"), "LA");
  m.set(norm("Lao PDR"), "LA");

  // ---- Vietnam
  m.set(norm("Vietnam"), "VN");
  m.set(norm("Viet Nam"), "VN");

  // ---- Myanmar
  m.set(norm("Myanmar"), "MM");
  m.set(norm("Burma"), "MM");

  // ---- Timor
  m.set(norm("East Timor"), "TL");
  m.set(norm("Timor-Leste"), "TL");

  // ---- UAE
  m.set(norm("United Arab Emirates"), "AE");
  m.set(norm("UAE"), "AE");

  // ---- United States
  m.set(norm("United States"), "US");
  m.set(norm("United States of America"), "US");
  m.set(norm("USA"), "US");
  m.set(norm("U.S."), "US");
  m.set(norm("U.S.A."), "US");

  // ---- Korea
  m.set(norm("Republic of Korea"), "KR");
  m.set(norm("Korea, Rep."), "KR");
  m.set(norm("South Korea"), "KR");
  m.set(norm("Korea"), "KR");
  m.set(norm("Democratic People's Republic of Korea"), "KP");
  m.set(norm("Korea, Dem. Rep."), "KP");
  m.set(norm("North Korea"), "KP");

  // ---- China / Taiwan / Hong Kong (datasets variam)
  m.set(norm("China"), "CN");
  m.set(norm("People's Republic of China"), "CN");
  m.set(norm("PR China"), "CN");
  m.set(norm("Taiwan"), "TW");
  m.set(norm("Taiwan, Province of China"), "TW");
  m.set(norm("Hong Kong"), "HK");
  m.set(norm("Hong Kong SAR"), "HK");

  // ---- Palestine / Israel
  m.set(norm("State of Palestine"), "PS");
  m.set(norm("Palestine"), "PS");
  m.set(norm("Palestinian Territories"), "PS");
  m.set(norm("Israel"), "IL");

  // ---- Bolivia / Venezuela (political)
  m.set(norm("Bolivia"), "BO");
  m.set(norm("Bolivia (Plurinational State of)"), "BO");
  m.set(norm("Venezuela"), "VE");
  m.set(norm("Venezuela (Bolivarian Republic of)"), "VE");

  // ---- Brunei
  m.set(norm("Brunei"), "BN");
  m.set(norm("Brunei Darussalam"), "BN");

  // ---- Russia-adj names that sometimes appear
  m.set(norm("Cabo Verde"), "CV"); // reforço
  m.set(norm("Curaçao"), "CW"); // pode aparecer; se você NÃO quer território, remove

  // ---- Serbia (EN) / Sérvia (PT) — geounit do europe.json usa "Serbia"
  m.set(norm("Serbia"), "RS");

  // ---- Sub-regiões europeias → país pai
  m.set(norm("Vojvodina"), "RS"); // região autônoma da Sérvia
  m.set(norm("Republic Srpska"), "BA"); // Republika Srpska (BA)
  m.set(norm("RepublicSrpska"), "BA");
  m.set(norm("Brussels Capital Region"), "BE");
  m.set(norm("BrusselsCapitalRegion"), "BE");
  m.set(norm("Flemish Region"), "BE");
  m.set(norm("FlemishRegion"), "BE");
  m.set(norm("Walloon Region"), "BE");
  m.set(norm("WalloonRegion"), "BE");
  m.set(norm("Isle of Man"), "IM");
  m.set(norm("IsleofMan"), "IM");

  // ---- Territórios → país pai
  m.set(norm("Aland"), "FI"); // Åland → Finlândia
  m.set(norm("Faroe Islands"), "FO");
  m.set(norm("FaroeIslands"), "FO");
  m.set(norm("Jan Mayen"), "NO");
  m.set(norm("JanMayen"), "NO");
  m.set(norm("Svalbard"), "NO");

  // ---- Variações de nome em inglês não cobertas acima
  m.set(norm("Republic of Congo"), "CG"); // geounit sem "the"
  m.set(norm("Hong Kong S.A.R."), "HK");
  m.set(norm("Hong Kong S.A.R"), "HK");
  m.set(norm("Macao S.A.R."), "MO");
  m.set(norm("Macao S.A.R"), "MO");
  m.set(norm("The Bahamas"), "BS");

  // ---- Fallback automático: versões sem espaço de todas as chaves existentes.
  // Cobre geounits colados como "CzechRepublic", "BosniaandHerzegovina",
  // "NorthernIreland", etc. que aparecem nos arquivos TopoJSON.
  for (const [key, value] of [...m.entries()]) {
    const noSpace = key.replace(/\s+/g, "");
    if (noSpace !== key && !m.has(noSpace)) {
      m.set(noSpace, value);
    }
  }

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
    p.geounit ??
      p.ADMIN ??
      p.admin ??
      p.SOVEREIGNT ??
      p.NAME_EN ??
      p.NAME_LONG ??
      p.FORMAL_EN ??
      p.BRK_NAME ??
      p.name ??
      p.NAME ??
      "",
  );
  const hit = nameToISO2.get(norm(candidate));
  return hit ?? "";
}

/**
 * LABEL do país:
 * 1) tenta ISO2 via getISO2FromCountryGeo(...)
 * 2) usa ISO2 -> nome PT via COUNTRY_OPTIONS (ISO2_TO_NAME)
 * 3) fallback: nome do dataset (se whitelist incompleta)
 */
export function getCountryLabel(
  geo: any,
  nameToISO2: Map<string, string>,
  iso2ToName: Map<string, string> = ISO2_TO_NAME,
): string {
  const iso2 = getISO2FromCountryGeo(geo, nameToISO2);

  if (iso2) {
    const pt = iso2ToName.get(iso2);
    if (pt) return pt;
  }

  const p = geo?.properties ?? {};
  const raw = safeStr(
    p.geounit ?? p.name ?? p.NAME ?? p.ADMIN ?? p.admin ?? "",
  );
  if (raw.toLowerCase() === "brazil") return "Brasil";
  return raw;
}

export function getUFfromBRGeo(geo: any): string {
  const p = geo?.properties ?? {};
  return safeStr(p.sigla || p.UF || p.uf || p.postal || "").toUpperCase();
}

/**
 * LABEL do estado:
 * 1) pega UF do geo
 * 2) usa UF -> nome PT via BR_STATES (UF_TO_NAME)
 * 3) fallback: nome do dataset
 */
export function getStateLabel(
  geo: any,
  ufToName: Map<string, string> = UF_TO_NAME,
): string {
  const uf = getUFfromBRGeo(geo);

  if (uf) {
    const pt = ufToName.get(uf);
    if (pt) return pt;
  }

  const p = geo?.properties ?? {};
  return safeStr(p.nome ?? p.NAME ?? p.name ?? "");
}
