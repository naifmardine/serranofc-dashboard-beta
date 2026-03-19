// lib/dashboard/geoOptions.ts
// Lista “completa o suficiente”: países soberanos (UN + alguns amplamente usados em datasets)
// Sem “mini ilhazinhas/territórios” (ex: Guam, Bermuda, Aruba, etc. ficam fora)
// Inclui microestados relevantes (Europa) e ilhas-nação maiores (ex: Madagascar, Haiti, Jamaica)

export type ContinentCode = "SA" | "NA" | "EU" | "AF" | "AS" | "OC";

export type CountryOption = {
  code: string; // ISO2
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
  // =========================
  // EUROPA (EU)
  // =========================
  { code: "AL", name: "Albânia", continent: "EU" },
  { code: "AD", name: "Andorra", continent: "EU" },
  { code: "AT", name: "Áustria", continent: "EU" },
  { code: "BY", name: "Bielorrússia", continent: "EU" },
  { code: "BE", name: "Bélgica", continent: "EU" },
  { code: "BA", name: "Bósnia e Herzegovina", continent: "EU" },
  { code: "BG", name: "Bulgária", continent: "EU" },
  { code: "HR", name: "Croácia", continent: "EU" },
  { code: "CY", name: "Chipre", continent: "EU" },
  { code: "CZ", name: "República Tcheca", continent: "EU" },
  { code: "DK", name: "Dinamarca", continent: "EU" },
  { code: "EE", name: "Estônia", continent: "EU" },
  { code: "FI", name: "Finlândia", continent: "EU" },
  { code: "FR", name: "França", continent: "EU" },
  { code: "DE", name: "Alemanha", continent: "EU" },
  { code: "GR", name: "Grécia", continent: "EU" },
  { code: "HU", name: "Hungria", continent: "EU" },
  { code: "IS", name: "Islândia", continent: "EU" },
  { code: "IE", name: "Irlanda", continent: "EU" },
  { code: "IT", name: "Itália", continent: "EU" },
  { code: "XK", name: "Kosovo", continent: "EU" }, // aparece em muitos datasets
  { code: "LV", name: "Letônia", continent: "EU" },
  { code: "LI", name: "Liechtenstein", continent: "EU" },
  { code: "LT", name: "Lituânia", continent: "EU" },
  { code: "LU", name: "Luxemburgo", continent: "EU" },
  { code: "MT", name: "Malta", continent: "EU" },
  { code: "MD", name: "Moldávia", continent: "EU" },
  { code: "MC", name: "Mônaco", continent: "EU" },
  { code: "ME", name: "Montenegro", continent: "EU" },
  { code: "NL", name: "Holanda", continent: "EU" },
  { code: "MK", name: "Macedônia do Norte", continent: "EU" },
  { code: "NO", name: "Noruega", continent: "EU" },
  { code: "PL", name: "Polônia", continent: "EU" },
  { code: "PT", name: "Portugal", continent: "EU" },
  { code: "RO", name: "Romênia", continent: "EU" },
  { code: "RU", name: "Rússia", continent: "EU" },
  { code: "SM", name: "San Marino", continent: "EU" },
  { code: "RS", name: "Sérvia", continent: "EU" },
  { code: "SK", name: "Eslováquia", continent: "EU" },
  { code: "SI", name: "Eslovênia", continent: "EU" },
  { code: "ES", name: "Espanha", continent: "EU" },
  { code: "SE", name: "Suécia", continent: "EU" },
  { code: "CH", name: "Suíça", continent: "EU" },
  { code: "UA", name: "Ucrânia", continent: "EU" },
  { code: "GB", name: "Reino Unido", continent: "EU" },
  { code: "VA", name: "Vaticano", continent: "EU" },

  // =========================
  // AMÉRICA DO SUL (SA)
  // =========================
  { code: "AR", name: "Argentina", continent: "SA" },
  { code: "BO", name: "Bolívia", continent: "SA" },
  { code: "BR", name: "Brasil", continent: "SA" },
  { code: "CL", name: "Chile", continent: "SA" },
  { code: "CO", name: "Colômbia", continent: "SA" },
  { code: "EC", name: "Equador", continent: "SA" },
  { code: "GY", name: "Guiana", continent: "SA" },
  { code: "PY", name: "Paraguai", continent: "SA" },
  { code: "PE", name: "Peru", continent: "SA" },
  { code: "SR", name: "Suriname", continent: "SA" },
  { code: "UY", name: "Uruguai", continent: "SA" },
  { code: "VE", name: "Venezuela", continent: "SA" },

  // =========================
  // AMÉRICA DO NORTE (NA) — inclui América Central e Caribe (principais)
  // =========================
  { code: "CA", name: "Canadá", continent: "NA" },
  { code: "US", name: "Estados Unidos", continent: "NA" },
  { code: "MX", name: "México", continent: "NA" },

  // América Central
  { code: "BZ", name: "Belize", continent: "NA" },
  { code: "CR", name: "Costa Rica", continent: "NA" },
  { code: "SV", name: "El Salvador", continent: "NA" },
  { code: "GT", name: "Guatemala", continent: "NA" },
  { code: "HN", name: "Honduras", continent: "NA" },
  { code: "NI", name: "Nicarágua", continent: "NA" },
  { code: "PA", name: "Panamá", continent: "NA" },

  // Caribe (principais países soberanos)
  { code: "BS", name: "Bahamas", continent: "NA" },
  { code: "BB", name: "Barbados", continent: "NA" },
  { code: "CU", name: "Cuba", continent: "NA" },
  { code: "DM", name: "Dominica", continent: "NA" },
  { code: "DO", name: "República Dominicana", continent: "NA" },
  { code: "GD", name: "Granada", continent: "NA" },
  { code: "HT", name: "Haiti", continent: "NA" },
  { code: "JM", name: "Jamaica", continent: "NA" },
  { code: "KN", name: "São Cristóvão e Névis", continent: "NA" },
  { code: "LC", name: "Santa Lúcia", continent: "NA" },
  { code: "VC", name: "São Vicente e Granadinas", continent: "NA" },
  { code: "TT", name: "Trinidad e Tobago", continent: "NA" },

  // =========================
  // ÁFRICA (AF)
  // =========================
  { code: "DZ", name: "Argélia", continent: "AF" },
  { code: "AO", name: "Angola", continent: "AF" },
  { code: "BJ", name: "Benin", continent: "AF" },
  { code: "BW", name: "Botswana", continent: "AF" },
  { code: "BF", name: "Burkina Faso", continent: "AF" },
  { code: "BI", name: "Burundi", continent: "AF" },
  { code: "CV", name: "Cabo Verde", continent: "AF" },
  { code: "CM", name: "Camarões", continent: "AF" },
  { code: "CF", name: "República Centro-Africana", continent: "AF" },
  { code: "TD", name: "Chade", continent: "AF" },
  { code: "KM", name: "Comores", continent: "AF" },
  { code: "CD", name: "República Democrática do Congo", continent: "AF" },
  { code: "CG", name: "República do Congo", continent: "AF" },
  { code: "CI", name: "Costa do Marfim", continent: "AF" },
  { code: "DJ", name: "Djibuti", continent: "AF" },
  { code: "EG", name: "Egito", continent: "AF" },
  { code: "GQ", name: "Guiné Equatorial", continent: "AF" },
  { code: "ER", name: "Eritreia", continent: "AF" },
  { code: "SZ", name: "Eswatini", continent: "AF" },
  { code: "ET", name: "Etiópia", continent: "AF" },
  { code: "GA", name: "Gabão", continent: "AF" },
  { code: "GM", name: "Gâmbia", continent: "AF" },
  { code: "GH", name: "Gana", continent: "AF" },
  { code: "GN", name: "Guiné", continent: "AF" },
  { code: "GW", name: "Guiné-Bissau", continent: "AF" },
  { code: "KE", name: "Quênia", continent: "AF" },
  { code: "LS", name: "Lesoto", continent: "AF" },
  { code: "LR", name: "Libéria", continent: "AF" },
  { code: "LY", name: "Líbia", continent: "AF" },
  { code: "MG", name: "Madagascar", continent: "AF" },
  { code: "MW", name: "Malawi", continent: "AF" },
  { code: "ML", name: "Mali", continent: "AF" },
  { code: "MR", name: "Mauritânia", continent: "AF" },
  { code: "MU", name: "Maurício", continent: "AF" },
  { code: "MA", name: "Marrocos", continent: "AF" },
  { code: "MZ", name: "Moçambique", continent: "AF" },
  { code: "NA", name: "Namíbia", continent: "AF" },
  { code: "NE", name: "Níger", continent: "AF" },
  { code: "NG", name: "Nigéria", continent: "AF" },
  { code: "RW", name: "Ruanda", continent: "AF" },
  { code: "ST", name: "São Tomé e Príncipe", continent: "AF" },
  { code: "SN", name: "Senegal", continent: "AF" },
  { code: "SC", name: "Seicheles", continent: "AF" },
  { code: "SL", name: "Serra Leoa", continent: "AF" },
  { code: "SO", name: "Somália", continent: "AF" },
  { code: "ZA", name: "África do Sul", continent: "AF" },
  { code: "SS", name: "Sudão do Sul", continent: "AF" },
  { code: "SD", name: "Sudão", continent: "AF" },
  { code: "TZ", name: "Tanzânia", continent: "AF" },
  { code: "TG", name: "Togo", continent: "AF" },
  { code: "TN", name: "Tunísia", continent: "AF" },
  { code: "UG", name: "Uganda", continent: "AF" },
  { code: "ZM", name: "Zâmbia", continent: "AF" },
  { code: "ZW", name: "Zimbábue", continent: "AF" },

  // =========================
  // ÁSIA (AS) — inclui Oriente Médio + Cáucaso + Ásia Central
  // =========================
  { code: "AF", name: "Afeganistão", continent: "AS" },
  { code: "AM", name: "Armênia", continent: "AS" },
  { code: "AZ", name: "Azerbaijão", continent: "AS" },
  { code: "BH", name: "Bahrein", continent: "AS" },
  { code: "BD", name: "Bangladesh", continent: "AS" },
  { code: "BT", name: "Butão", continent: "AS" },
  { code: "BN", name: "Brunei", continent: "AS" },
  { code: "KH", name: "Camboja", continent: "AS" },
  { code: "CN", name: "China", continent: "AS" },
  { code: "GE", name: "Geórgia", continent: "AS" },
  { code: "IN", name: "Índia", continent: "AS" },
  { code: "ID", name: "Indonésia", continent: "AS" },
  { code: "IR", name: "Irã", continent: "AS" },
  { code: "IQ", name: "Iraque", continent: "AS" },
  { code: "IL", name: "Israel", continent: "AS" },
  { code: "JP", name: "Japão", continent: "AS" },
  { code: "JO", name: "Jordânia", continent: "AS" },
  { code: "KZ", name: "Cazaquistão", continent: "AS" },
  { code: "KW", name: "Kuwait", continent: "AS" },
  { code: "KG", name: "Quirguistão", continent: "AS" },
  { code: "LA", name: "Laos", continent: "AS" },
  { code: "LB", name: "Líbano", continent: "AS" },
  { code: "MY", name: "Malásia", continent: "AS" },
  { code: "MV", name: "Maldivas", continent: "AS" },
  { code: "MN", name: "Mongólia", continent: "AS" },
  { code: "MM", name: "Mianmar", continent: "AS" },
  { code: "NP", name: "Nepal", continent: "AS" },
  { code: "KP", name: "Coreia do Norte", continent: "AS" },
  { code: "KR", name: "Coreia do Sul", continent: "AS" },
  { code: "OM", name: "Omã", continent: "AS" },
  { code: "PK", name: "Paquistão", continent: "AS" },
  { code: "PS", name: "Palestina", continent: "AS" }, // aparece em muitos datasets
  { code: "PH", name: "Filipinas", continent: "AS" },
  { code: "QA", name: "Catar", continent: "AS" },
  { code: "SA", name: "Arábia Saudita", continent: "AS" },
  { code: "SG", name: "Singapura", continent: "AS" },
  { code: "LK", name: "Sri Lanka", continent: "AS" },
  { code: "SY", name: "Síria", continent: "AS" },
  { code: "TW", name: "Taiwan", continent: "AS" }, // comum em datasets
  { code: "TJ", name: "Tajiquistão", continent: "AS" },
  { code: "TH", name: "Tailândia", continent: "AS" },
  { code: "TL", name: "Timor-Leste", continent: "AS" },
  { code: "TR", name: "Turquia", continent: "AS" }, // em alguns datasets aparece como EU; aqui fica AS pra evitar duplicidade
  { code: "TM", name: "Turcomenistão", continent: "AS" },
  { code: "AE", name: "Emirados Árabes Unidos", continent: "AS" },
  { code: "UZ", name: "Uzbequistão", continent: "AS" },
  { code: "VN", name: "Vietnã", continent: "AS" },
  { code: "YE", name: "Iêmen", continent: "AS" },

  // =========================
  // OCEANIA (OC)
  // =========================
  { code: "AU", name: "Austrália", continent: "OC" },
  { code: "FJ", name: "Fiji", continent: "OC" },
  { code: "NZ", name: "Nova Zelândia", continent: "OC" },
  { code: "PG", name: "Papua-Nova Guiné", continent: "OC" },
  { code: "SB", name: "Ilhas Salomão", continent: "OC" },
  { code: "VU", name: "Vanuatu", continent: "OC" },
  { code: "WS", name: "Samoa", continent: "OC" },
  { code: "TO", name: "Tonga", continent: "OC" },
  { code: "TV", name: "Tuvalu", continent: "OC" }, // pequeno, mas aparece
  { code: "NR", name: "Nauru", continent: "OC" }, // pequeno, mas aparece
  { code: "FM", name: "Micronésia", continent: "OC" }, // federados
  { code: "MH", name: "Ilhas Marshall", continent: "OC" },
  { code: "PW", name: "Palau", continent: "OC" },
  { code: "KI", name: "Kiribati", continent: "OC" },
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

// ===== Helpers =====
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