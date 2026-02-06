import { WidgetDefinition } from "@/type/dashboard";

/**
 * DEFINIÇÃO ÚNICA E CANÔNICA DOS WIDGETS
 * ------------------------------------
 * - IDs estáveis (NUNCA renomear sem migration)
 * - Metadados de UX (título, descrição, grupo)
 * - Defaults do dashboard
 *
 * Regra de ouro:
 *  se não está aqui, NÃO EXISTE pro dashboard
 */

export const WIDGETS: WidgetDefinition[] = [

    /* ======================================================
   * OVERVIEW / GEO MAP
   * ====================================================== */
  {
    id: "overview.geo_map",
    title: "Mapa (mundo → Brasil)",
    description: "Jogadores por país e, ao clicar no Brasil, por estado (UF).",
    group: "overview",
    scope: "both",
    defaultEnabled: true,
    defaultSize: "lg", // ✅ fixado em LG por default
    keywords: ["mapa", "mundo", "brasil", "país", "estado", "geografia"],
  },
  /* ======================================================
   * OVERVIEW / KPIs
   * ====================================================== */
  {
    id: "kpi.serrano.players_count",
    title: "Jogadores do Serrano",
    description: "Quantidade total de jogadores do elenco.",
    group: "overview",
    scope: "serrano",
    defaultEnabled: false,
    defaultSize: "sm",
    keywords: ["jogadores", "elenco", "total"],
  },
  {
    id: "kpi.serrano.total_market_value",
    title: "Valor de mercado total",
    description: "Soma do valor de mercado do elenco.",
    group: "overview",
    scope: "serrano",
    defaultEnabled: false,
    defaultSize: "sm",
    keywords: ["valor", "mercado", "financeiro"],
  },
  {
    id: "kpi.serrano.avg_age",
    title: "Idade média",
    description: "Idade média dos jogadores do Serrano.",
    group: "overview",
    scope: "serrano",
    defaultEnabled: false,
    defaultSize: "sm",
    keywords: ["idade", "média"],
  },
  {
    id: "kpi.market.deals_count",
    title: "Transações no mercado",
    description: "Número de transferências no período.",
    group: "overview",
    scope: "market",
    defaultEnabled: false,
    defaultSize: "sm",
    keywords: ["transferências", "mercado"],
  },
  {
    id: "kpi.market.total_fee",
    title: "Volume financeiro do mercado",
    description: "Valor total movimentado em transferências.",
    group: "overview",
    scope: "market",
    defaultEnabled: false,
    defaultSize: "sm",
    keywords: ["valor", "mercado", "transferências"],
  },

  /* ======================================================
   * SERRANO
   * ====================================================== */
  {
    id: "serrano.age_distribution",
    title: "Distribuição de idades",
    description: "Jogadores do Serrano por faixa etária.",
    group: "serrano",
    scope: "serrano",
    defaultEnabled: true,
    defaultSize: "md",
    keywords: ["idade", "faixa", "histograma"],
  },
  {
    id: "serrano.position_distribution",
    title: "Distribuição por posição",
    description: "Composição do elenco por posição.",
    group: "serrano",
    scope: "serrano",
    defaultEnabled: true,
    defaultSize: "md",
    keywords: ["posição", "elenco"],
  },
  {
    id: "serrano.market_value_top_players",
    title: "Top jogadores por valor de mercado",
    description: "Ranking dos jogadores mais valiosos do elenco.",
    group: "serrano",
    scope: "serrano",
    defaultEnabled: true,
    defaultSize: "lg",
    keywords: ["valor", "ranking", "jogadores"],
  },
  {
    id: "serrano.value_over_time",
    title: "Evolução do valor do elenco",
    description:
      "Valor agregado do elenco ao longo do tempo (snapshots).",
    group: "serrano",
    scope: "serrano",
    defaultEnabled: false,
    defaultSize: "lg",
    keywords: ["histórico", "valor", "tempo"],
  },
  {
    id: "serrano.age_vs_value_scatter",
    title: "Idade vs valor de mercado",
    description: "Relação entre idade e valor dos jogadores.",
    group: "serrano",
    scope: "serrano",
    defaultEnabled: false,
    defaultSize: "lg",
    keywords: ["idade", "valor", "scatter"],
  },
  {
    id: "serrano.representation_ranking",
    title: "Agências / Representação",
    description: "Ranking de agências por número e valor de jogadores.",
    group: "serrano",
    scope: "serrano",
    defaultEnabled: false,
    defaultSize: "md",
    keywords: ["agência", "representação"],
  },

  /* ======================================================
   * MARKET
   * ====================================================== */
  {
    id: "market.deals_by_month",
    title: "Transações por mês",
    description: "Volume mensal de transferências.",
    group: "market",
    scope: "market",
    defaultEnabled: false,
    defaultSize: "md",
    keywords: ["transações", "mensal"],
  },
  {
    id: "market.fee_by_month",
    title: "Valor movimentado por mês",
    description: "Soma mensal dos valores de transferência.",
    group: "market",
    scope: "market",
    defaultEnabled: false,
    defaultSize: "md",
    keywords: ["valor", "mensal"],
  },
  {
    id: "market.fee_distribution",
    title: "Distribuição dos valores",
    description: "Distribuição dos valores das transferências.",
    group: "market",
    scope: "market",
    defaultEnabled: false,
    defaultSize: "md",
    keywords: ["histograma", "valor"],
  },
  {
    id: "market.top_buyers_sellers",
    title: "Top clubes compradores/vendedores",
    description: "Ranking de clubes por volume financeiro.",
    group: "market",
    scope: "market",
    defaultEnabled: false,
    defaultSize: "lg",
    keywords: ["clubes", "ranking"],
  },
  {
    id: "market.top_leagues_countries",
    title: "Top ligas e países",
    description: "Distribuição de transferências por liga ou país.",
    group: "market",
    scope: "market",
    defaultEnabled: false,
    defaultSize: "md",
    keywords: ["ligas", "países"],
  },
  {
    id: "market.age_vs_fee_scatter",
    title: "Idade vs valor da transferência",
    description: "Relação entre idade e valor das transferências.",
    group: "market",
    scope: "market",
    defaultEnabled: false,
    defaultSize: "lg",
    keywords: ["idade", "valor", "scatter"],
  },
  {
    id: "market.position_avg_fee",
    title: "Valor médio por posição",
    description: "Valor médio das transferências por posição.",
    group: "market",
    scope: "market",
    defaultEnabled: false,
    defaultSize: "md",
    keywords: ["posição", "média"],
  },

  /* ======================================================
   * COMPARE
   * ====================================================== */
  {
    id: "compare.position_share_serrano_vs_market",
    title: "Posições: Serrano vs Mercado",
    description:
      "Comparação percentual de posições entre elenco e mercado.",
    group: "compare",
    scope: "both",
    defaultEnabled: false,
    defaultSize: "lg",
    keywords: ["comparação", "posição"],
  },
  {
    id: "compare.avg_age_by_position",
    title: "Idade média por posição",
    description:
      "Comparação da idade média por posição (Serrano vs mercado).",
    group: "compare",
    scope: "both",
    defaultEnabled: false,
    defaultSize: "lg",
    keywords: ["comparação", "idade"],
  },
];
