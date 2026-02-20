export type ContinentCode = "SA" | "NA" | "EU" | "AF" | "AS" | "OC";

export type CountryOption = {
  code: string;      // ISO2
  name: string;
  continent: ContinentCode;
};

export type ContinentOption = {
  code: ContinentCode;
  name: string;
};

export type BRStateOption = {
  code: string; // UF
  name: string;
};

// ===== Continentes =====
export const CONTINENT_OPTIONS: ContinentOption[] = [
  { code: "SA", name: "América do Sul" },
  { code: "NA", name: "América do Norte" },
  { code: "EU", name: "Europa" },
  { code: "AF", name: "África" },
  { code: "AS", name: "Ásia" },
  { code: "OC", name: "Oceania" },
];

// ===== Países (ISO2) =====
export const COUNTRY_OPTIONS: CountryOption[] = [
  // ===== EUROPA (EU) =====
  { code: "PT", name: "Portugal", continent: "EU" },
  { code: "ES", name: "Espanha", continent: "EU" },
  { code: "FR", name: "França", continent: "EU" },
  { code: "DE", name: "Alemanha", continent: "EU" },
  { code: "IT", name: "Itália", continent: "EU" },
  { code: "GB", name: "Reino Unido", continent: "EU" },
  { code: "IE", name: "Irlanda", continent: "EU" },
  { code: "NL", name: "Holanda", continent: "EU" },
  { code: "BE", name: "Bélgica", continent: "EU" },
  { code: "CH", name: "Suíça", continent: "EU" },
  { code: "AT", name: "Áustria", continent: "EU" },
  { code: "SE", name: "Suécia", continent: "EU" },
  { code: "NO", name: "Noruega", continent: "EU" },
  { code: "DK", name: "Dinamarca", continent: "EU" },
  { code: "FI", name: "Finlândia", continent: "EU" },
  { code: "PL", name: "Polônia", continent: "EU" },
  { code: "CZ", name: "República Tcheca", continent: "EU" },
  { code: "SK", name: "Eslováquia", continent: "EU" },
  { code: "HU", name: "Hungria", continent: "EU" },
  { code: "RO", name: "Romênia", continent: "EU" },
  { code: "BG", name: "Bulgária", continent: "EU" },
  { code: "GR", name: "Grécia", continent: "EU" },
  { code: "TR", name: "Turquia", continent: "EU" },
  { code: "UA", name: "Ucrânia", continent: "EU" },
  { code: "RU", name: "Rússia", continent: "EU" },
  { code: "RS", name: "Sérvia", continent: "EU" },
  { code: "HR", name: "Croácia", continent: "EU" },
  { code: "BA", name: "Bósnia e Herzegovina", continent: "EU" },
  { code: "ME", name: "Montenegro", continent: "EU" },
  { code: "MK", name: "Macedônia do Norte", continent: "EU" },
  { code: "AL", name: "Albânia", continent: "EU" },
  { code: "SI", name: "Eslovênia", continent: "EU" },
  { code: "LT", name: "Lituânia", continent: "EU" },
  { code: "LV", name: "Letônia", continent: "EU" },
  { code: "EE", name: "Estônia", continent: "EU" },
  { code: "IS", name: "Islândia", continent: "EU" },
  { code: "LU", name: "Luxemburgo", continent: "EU" },
  { code: "MT", name: "Malta", continent: "EU" },
  { code: "CY", name: "Chipre", continent: "EU" },

  // ===== AMÉRICA DO SUL (SA) =====
  { code: "AR", name: "Argentina", continent: "SA" },
  { code: "UY", name: "Uruguai", continent: "SA" },
  { code: "CL", name: "Chile", continent: "SA" },
  { code: "PY", name: "Paraguai", continent: "SA" },
  { code: "BO", name: "Bolívia", continent: "SA" },
  { code: "PE", name: "Peru", continent: "SA" },
  { code: "CO", name: "Colômbia", continent: "SA" },
  { code: "EC", name: "Equador", continent: "SA" },
  { code: "VE", name: "Venezuela", continent: "SA" },
  { code: "GY", name: "Guiana", continent: "SA" },
  { code: "SR", name: "Suriname", continent: "SA" },

  // ===== AMÉRICA DO NORTE (NA) =====
  { code: "US", name: "Estados Unidos", continent: "NA" },
  { code: "CA", name: "Canadá", continent: "NA" },
  { code: "MX", name: "México", continent: "NA" },
  { code: "CR", name: "Costa Rica", continent: "NA" },
  { code: "PA", name: "Panamá", continent: "NA" },
  { code: "GT", name: "Guatemala", continent: "NA" },
  { code: "HN", name: "Honduras", continent: "NA" },
  { code: "SV", name: "El Salvador", continent: "NA" },
  { code: "NI", name: "Nicarágua", continent: "NA" },
  { code: "DO", name: "República Dominicana", continent: "NA" },
  { code: "JM", name: "Jamaica", continent: "NA" },
  { code: "TT", name: "Trinidad e Tobago", continent: "NA" },
  { code: "BS", name: "Bahamas", continent: "NA" },

  // ===== ÁFRICA (AF) =====
  { code: "MA", name: "Marrocos", continent: "AF" },
  { code: "DZ", name: "Argélia", continent: "AF" },
  { code: "TN", name: "Tunísia", continent: "AF" },
  { code: "EG", name: "Egito", continent: "AF" },
  { code: "NG", name: "Nigéria", continent: "AF" },
  { code: "GH", name: "Gana", continent: "AF" },
  { code: "CI", name: "Costa do Marfim", continent: "AF" },
  { code: "SN", name: "Senegal", continent: "AF" },
  { code: "CM", name: "Camarões", continent: "AF" },
  { code: "ZA", name: "África do Sul", continent: "AF" },
  { code: "AO", name: "Angola", continent: "AF" },
  { code: "MZ", name: "Moçambique", continent: "AF" },
  { code: "KE", name: "Quênia", continent: "AF" },
  { code: "ET", name: "Etiópia", continent: "AF" },
  { code: "UG", name: "Uganda", continent: "AF" },
  { code: "TZ", name: "Tanzânia", continent: "AF" },

  // ===== ÁSIA (AS) =====
  { code: "JP", name: "Japão", continent: "AS" },
  { code: "KR", name: "Coreia do Sul", continent: "AS" },
  { code: "CN", name: "China", continent: "AS" },
  { code: "IN", name: "Índia", continent: "AS" },
  { code: "ID", name: "Indonésia", continent: "AS" },
  { code: "TH", name: "Tailândia", continent: "AS" },
  { code: "VN", name: "Vietnã", continent: "AS" },
  { code: "MY", name: "Malásia", continent: "AS" },
  { code: "PH", name: "Filipinas", continent: "AS" },
  { code: "SG", name: "Singapura", continent: "AS" },
  { code: "HK", name: "Hong Kong", continent: "AS" },
  { code: "AE", name: "Emirados Árabes Unidos", continent: "AS" },
  { code: "SA", name: "Arábia Saudita", continent: "AS" },
  { code: "QA", name: "Catar", continent: "AS" },
  { code: "KW", name: "Kuwait", continent: "AS" },
  { code: "IL", name: "Israel", continent: "AS" },
  { code: "IR", name: "Irã", continent: "AS" },
  { code: "IQ", name: "Iraque", continent: "AS" },
  { code: "SY", name: "Síria", continent: "AS" },
  { code: "JO", name: "Jordânia", continent: "AS" },
  { code: "LB", name: "Líbano", continent: "AS" },
  { code: "PK", name: "Paquistão", continent: "AS" },
  { code: "BD", name: "Bangladesh", continent: "AS" },

  // ===== OCEANIA (OC) =====
  { code: "AU", name: "Austrália", continent: "OC" },
  { code: "NZ", name: "Nova Zelândia", continent: "OC" },
  { code: "FJ", name: "Fiji", continent: "OC" },
];

// ===== Estados do Brasil (UF) =====
export const BR_STATES: BRStateOption[] = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
];

// ===== Helpers (opcional, mas útil pra você) =====
export function upper(v: string) {
  return (v ?? "").trim().toUpperCase();
}

export function findCountryByCode(code: string) {
  const cc = upper(code);
  return COUNTRY_OPTIONS.find((c) => c.code === cc) ?? null;
}

export function findStateByUF(uf: string) {
  const u = upper(uf);
  return BR_STATES.find((s) => s.code === u) ?? null;
}
