from __future__ import annotations

import re
from typing import Any, Callable, Dict, List, Optional, Tuple

from app.core.config import settings
from app.db.conn import get_conn

ToolHandler = Callable[[Dict[str, Any]], Dict[str, Any]]

SENSITIVE_FIELDS = {"cpf"}

# Conjunto canônico de códigos de posição — usado em toda normalização
VALID_POSITION_CODES = frozenset({"PE", "PD", "LD", "LE", "MEI", "MC", "ATA", "GOL", "VOL", "ZAG"})

DEFAULT_PLAYER_COLUMNS = [
    "id",
    "full_name",
    "known_as",
    "position_code",
    "birth_year",
    "age",
    "club_name",
    "agency",
    "market_value_mEUR",
    "serrano_ownership_pct",
    "dominant_foot",
    "european_passport",
    "national_team_called",
    "passaporte_raw",       # conteúdo real do campo passaporte (Json)
    "selecao_raw",          # conteúdo real do campo selecao (Json)
    # "has_cpf" removed from defaults due to casting issues in the database
]

# allow has_cpf explicitly even though it's not part of the default projection
ALLOWED_COLUMNS = set(DEFAULT_PLAYER_COLUMNS + [
    "height_cm", "club", "club_id", "has_cpf",
    "nationality", "jersey_number", "city",
    "serrano_rights_pct", "commission_pct",
    "first_option_value", "second_option_value",
    "prospection_value", "transfer_ref_value",
    "passaporte_raw", "selecao_raw",
    # Localização do Clube
    "club_country_code", "club_country_name",
    "club_state_code", "club_state_name",
    "club_location_city", "club_continent",
])

ALLOWED_METRICS = {
    "market_value_mEUR",
    "serrano_ownership_pct",
    "serrano_rights_pct",
    "commission_pct",
    "first_option_value",
    "second_option_value",
    "prospection_value",
    "transfer_ref_value",
    "age",
    "birth_year",
    "height_cm",
}

ALLOWED_GROUP_BY = {
    "position_code",
    "club_name",
    "club",
    "club_id",
    "agency",
    "dominant_foot",
    "european_passport",
    "national_team_called",
    "has_cpf",
    "age",
    "birth_year",
    "height_cm",
}

ALLOWED_FILTER_BASE = {
    "id",
    "full_name",
    "known_as",
    "club_name",
    "club",
    "club_id",
    "position_code",
    "agency",
    "dominant_foot",
    "european_passport",
    "national_team_called",
    "has_cpf",
    "age",
    "birth_year",
    "height_cm",
    "market_value_mEUR",
    "serrano_ownership_pct",
    "serrano_rights_pct",
    "commission_pct",
    "first_option_value",
    "second_option_value",
    "prospection_value",
    "transfer_ref_value",
    "nationality",
    # Localização do Clube
    "club_country_code",
    "club_country_name",
    "club_state_code",
    "club_state_name",
    "club_location_city",
    "club_continent",
}

OP_SUFFIXES = ("_gte", "_lte", "_gt", "_lt", "_eq", "_neq", "_in")

METRIC_ALIASES = {
    "market_value": "market_value_mEUR",
    "market_value_meur": "market_value_mEUR",
    "valor_mercado": "market_value_mEUR",
    "valor de mercado": "market_value_mEUR",
    "valorMercado": "market_value_mEUR",
    "market value": "market_value_mEUR",
    "serrano_ownership": "serrano_ownership_pct",
    "ownership_pct": "serrano_ownership_pct",
    "ownership": "serrano_ownership_pct",
    "% serrano": "serrano_ownership_pct",
    "posse": "serrano_ownership_pct",
    "possePct": "serrano_ownership_pct",
    "direitos": "serrano_rights_pct",
    "direitos_serrano": "serrano_rights_pct",
    "direitosSerrano": "serrano_rights_pct",
    "comissao": "commission_pct",
    "comissão": "commission_pct",
    "commission": "commission_pct",
    "opcao1": "first_option_value",
    "primeira_opcao": "first_option_value",
    "opcao2": "second_option_value",
    "segunda_opcao": "second_option_value",
    "prosp": "prospection_value",
    "valorProsp": "prospection_value",
    "prospeccao": "prospection_value",
    "ref_value": "transfer_ref_value",
    "valorTransfRef": "transfer_ref_value",
    "idade": "age",
    "age": "age",
    "altura": "height_cm",
    "height": "height_cm",
    "ano_nascimento": "birth_year",
    "birth_year": "birth_year",
}

COLUMN_ALIASES = {
    "name": "full_name",
    "player_name": "full_name",
    "jogador": "full_name",
    "nome": "full_name",
    "apelido": "known_as",
    "known_as": "known_as",
    "position": "position_code",
    "posicao": "position_code",
    "posição": "position_code",
    "age": "age",
    "idade": "age",
    "club": "club_name",
    "club_name": "club_name",
    "clube": "club_name",
    "agencia": "agency",
    "agência": "agency",
    "agency": "agency",
    "market_value": "market_value_mEUR",
    "market_value_meur": "market_value_mEUR",
    "valor_mercado": "market_value_mEUR",
    "valor de mercado": "market_value_mEUR",
    "valorMercado": "market_value_mEUR",
    "serrano_ownership_pct": "serrano_ownership_pct",
    "posse_pct": "serrano_ownership_pct",
    "possePct": "serrano_ownership_pct",
    "height": "height_cm",
    "altura": "height_cm",
    "direitos": "serrano_rights_pct",
    "direitosSerrano": "serrano_rights_pct",
    "comissao": "commission_pct",
    "comissão": "commission_pct",
    "primeira_opcao": "first_option_value",
    "segunda_opcao": "second_option_value",
    "prospecao": "prospection_value",
    "prospeccao": "prospection_value",
    "valorProsp": "prospection_value",
    "ref_value": "transfer_ref_value",
    "valorTransfRef": "transfer_ref_value",
    "nationality": "nationality",
    "nacionalidade": "nationality",
    "jersey": "jersey_number",
    "numeroCamisa": "jersey_number",
    "cidade": "city",
}

FILTER_KEY_ALIASES = {
    # Nome
    "name":              "full_name",
    "player_name":       "full_name",
    "nome":              "full_name",
    "apelido":           "known_as",
    # Posição
    "position":          "position_code",
    "posicao":           "position_code",
    "posição":           "position_code",
    # Valor de mercado
    "market_value":      "market_value_mEUR",
    "market_value_meur": "market_value_mEUR",
    "valor_mercado":     "market_value_mEUR",
    "valor":             "market_value_mEUR",
    # Posse / Direitos
    "ownership":         "serrano_ownership_pct",
    "ownership_pct":     "serrano_ownership_pct",
    "posse":             "serrano_ownership_pct",
    "posse_pct":         "serrano_ownership_pct",
    "direitos":          "serrano_rights_pct",
    "direitos_serrano":  "serrano_rights_pct",
    # Comissão e opções
    "comissao":          "commission_pct",
    "comissão":          "commission_pct",
    "primeira_opcao":    "first_option_value",
    "opcao1":            "first_option_value",
    "segunda_opcao":     "second_option_value",
    "opcao2":            "second_option_value",
    "prosp":             "prospection_value",
    "prospecao":         "prospection_value",
    "ref_value":         "transfer_ref_value",
    "valor_ref":         "transfer_ref_value",
    # Idade / nascimento
    "idade":             "age",
    "ano":               "birth_year",
    "ano_nascimento":    "birth_year",
    # Altura
    "altura":            "height_cm",
    # Clube
    "club":              "club_name",
    "clube":             "club_name",
    # Agência / empresário
    "agencia":           "agency",
    "agência":           "agency",
    "empresario":        "agency",
    "empresário":        "agency",
    # Pé dominante
    "foot":              "dominant_foot",
    "pe_dominante":      "dominant_foot",
    "pé_dominante":      "dominant_foot",
    # Flags booleanas
    "passaporte":        "european_passport",
    "passport":          "european_passport",
    "selecao":           "national_team_called",
    "seleção":           "national_team_called",
    "convocado":         "national_team_called",
    "cpf":               "has_cpf",
    # Identidade
    "nacionalidade":     "nationality",
    # Localização do Clube
    "estado":            "club_state_name",
    "estado_uf":         "club_state_code",
    "uf":                "club_state_code",
    "pais":              "club_country_name",
    "país":              "club_country_name",
    "pais_code":         "club_country_code",
    "country":           "club_country_code",
    "country_name":      "club_country_name",
    "state":             "club_state_name",
    "state_code":        "club_state_code",
    "continente":        "club_continent",
    "continent":         "club_continent",
    "cidade":            "club_location_city",
    "city":              "club_location_city",
}

CLUB_ALIASES = {
    "serrano": "Serrano FC",
    "serrano fc": "Serrano FC",
}

# Grupos de posição do domínio Serrano: um alias pode mapear para múltiplos códigos
POSITION_GROUP_ALIASES: Dict[str, List[str]] = {
    "ponta":           ["PE", "PD"],
    "pontas":          ["PE", "PD"],
    "winger":          ["PE", "PD"],
    "wingers":         ["PE", "PD"],
    "ala":             ["PE", "PD"],   # termo comum no futebol brasileiro
    "alas":            ["PE", "PD"],
    "extremo":         ["PE", "PD"],   # termo em português europeu
    "extremos":        ["PE", "PD"],
    "lateral":         ["LE", "LD"],
    "laterais":        ["LE", "LD"],
    "meias":           ["MEI", "MC"],  # ambos os tipos de meia
    "meiocampistas":   ["MEI", "MC"],
    "meio-campistas":  ["MEI", "MC"],
}

# Alias de posição individual: um label → um único código canônico
POSITION_SINGLE_ALIASES: Dict[str, str] = {
    # Nomes completos
    "ponta esquerda":   "PE",
    "ponta direita":    "PD",
    "lateral direito":  "LD",
    "lateral esquerdo": "LE",
    "meia":             "MEI",
    "meio-campo":       "MEI",
    "meio campo":       "MC",    # sem hífen → MC (meio-campo central)
    "atacante":         "ATA",
    "goleiro":          "GOL",
    "volante":          "VOL",
    "zagueiro":         "ZAG",
    # Variantes de ala / extremo
    "ala direita":      "PD",
    "ala-direita":      "PD",
    "ala esquerda":     "PE",
    "ala-esquerda":     "PE",
    "extremo direito":  "PD",
    "extremo esquerdo": "PE",
    # Coloquial brasileiro
    "zaga":             "ZAG",
    "centroavante":     "ATA",
    "centro-avante":    "ATA",
    "goleira":          "GOL",   # forma feminina
    "segundo volante":  "VOL",
    "meia-campista":    "MEI",
    "meia campista":    "MEI",
    # Laterais com hífen
    "lateral-direito":  "LD",
    "lateral-esquerdo": "LE",
    # Inglês
    "right winger":     "PD",
    "left winger":      "PE",
    "right back":       "LD",
    "left back":        "LE",
    "goalkeeper":       "GOL",
    "striker":          "ATA",
    "forward":          "ATA",
    "center back":      "ZAG",
    "centre back":      "ZAG",
    "center-back":      "ZAG",
    "centre-back":      "ZAG",
    # Códigos curtos (case-insensitive via .lower() na lookup)
    "pe": "PE", "pd": "PD", "ld": "LD", "le": "LE",
    "mc": "MC", "mei": "MEI", "ata": "ATA", "gol": "GOL", "vol": "VOL", "zag": "ZAG",
}


def expand_position_query(value: Any) -> Optional[List[str]]:
    """
    Expande um valor de posição para lista de códigos canônicos.
    - Grupo (ex: "ponta") → ["PE", "PD"]
    - Posição única (ex: "atacante") → ["ATA"]
    - Código válido (ex: "PE", "MC") → ["PE"] / ["MC"]
    - Não reconhecido → None
    """
    if not isinstance(value, str):
        return None
    v = value.strip().lower()
    if v in POSITION_GROUP_ALIASES:
        return list(POSITION_GROUP_ALIASES[v])
    if v in POSITION_SINGLE_ALIASES:
        return [POSITION_SINGLE_ALIASES[v]]
    vu = v.upper()
    if vu in VALID_POSITION_CODES:
        return [vu]
    return None


# Mapeamento de termos/códigos → texto para busca ILIKE na tabela Transferencia.
# A tabela armazena 7 posições canônicas: ponta | meia | atacante | volante | lateral | zagueiro | goleiro
# IMPORTANTE: o mercado NÃO distingue lado (esquerdo/direito). PE e PD → "ponta"; LD e LE → "lateral".
TRANSFER_POSICAO_NORM: Dict[str, str] = {
    # Códigos canônicos Serrano → termo canônico do mercado
    "pe":  "ponta",     # ponta esquerda → categoria ponta (mercado não distingue lado)
    "pd":  "ponta",     # ponta direita  → categoria ponta
    "ld":  "lateral",   # lateral direito → categoria lateral
    "le":  "lateral",   # lateral esquerdo → categoria lateral
    "gol": "goleiro",
    "zag": "zagueiro",
    "vol": "volante",
    "mei": "meia",
    "mc":  "meia",      # meio-campo central → meia (classe mais próxima no mercado)
    "ata": "atacante",
    # Termos naturais em português
    "ponta":            "ponta",
    "ponta esquerda":   "ponta",
    "ponta direita":    "ponta",
    "ala":              "ponta",
    "alas":             "ponta",
    "ala esquerda":     "ponta",
    "ala direita":      "ponta",
    "ala-esquerda":     "ponta",
    "ala-direita":      "ponta",
    "extremo":          "ponta",
    "extremo direito":  "ponta",
    "extremo esquerdo": "ponta",
    "lateral":          "lateral",
    "lateral direito":  "lateral",
    "lateral esquerdo": "lateral",
    "lateral-direito":  "lateral",
    "lateral-esquerdo": "lateral",
    "laterais":         "lateral",
    "goleiro":          "goleiro",
    "goleira":          "goleiro",
    "zagueiro":         "zagueiro",
    "zaga":             "zagueiro",
    "volante":          "volante",
    "segundo volante":  "volante",
    "meia":             "meia",
    "meio-campo":       "meia",
    "meio campo":       "meia",
    "meiocampista":     "meia",
    "meio-campista":    "meia",
    "meia-campista":    "meia",
    "atacante":         "atacante",
    "centroavante":     "atacante",
    "centro-avante":    "atacante",
    # Inglês
    "winger":           "ponta",
    "striker":          "atacante",
    "forward":          "atacante",
    "goalkeeper":       "goleiro",
    "right winger":     "ponta",
    "left winger":      "ponta",
    "right back":       "lateral",
    "left back":        "lateral",
    "center back":      "zagueiro",
    "centre back":      "zagueiro",
    "defensive mid":    "volante",
    "midfielder":       "meia",
}


def normalize_transfer_posicao(posicao: str) -> str:
    """Normaliza posição para busca textual ILIKE na tabela Transferencia."""
    v = str(posicao or "").strip()
    if not v:
        return v
    return TRANSFER_POSICAO_NORM.get(v.lower(), v)


def _clamp_int(v: Any, default: int, min_v: int, max_v: int) -> int:
    try:
        v = int(v)
    except Exception:
        v = default
    return max(min_v, min(max_v, v))


def _filter_key_base(k: str) -> str:
    for suf in OP_SUFFIXES:
        if k.endswith(suf):
            return k[: -len(suf)]
    return k


def _normalize_metric(metric: Any) -> str:
    m = str(metric or "").strip()
    if not m:
        return ""
    return METRIC_ALIASES.get(m, METRIC_ALIASES.get(m.lower(), m))


def _normalize_column(col: Any) -> str:
    c = str(col or "").strip()
    if not c:
        return ""
    return COLUMN_ALIASES.get(c, COLUMN_ALIASES.get(c.lower(), c))


def _normalize_group_by(group_by: Any) -> str:
    g = _normalize_column(group_by)
    return "club_name" if g == "club" else g


def _normalize_filter_key(key: str) -> str:
    key = str(key or "").strip()
    if not key:
        return ""

    for suf in OP_SUFFIXES:
        if key.endswith(suf):
            base = key[: -len(suf)]
            base = FILTER_KEY_ALIASES.get(base, FILTER_KEY_ALIASES.get(base.lower(), base))
            if base == "club":
                base = "club_name"
            return f"{base}{suf}"

    base = FILTER_KEY_ALIASES.get(key, FILTER_KEY_ALIASES.get(key.lower(), key))
    if base == "club":
        base = "club_name"
    return base


def _normalize_filter_value(key: str, value: Any) -> Any:
    base = _filter_key_base(key)
    if base == "club_name" and isinstance(value, str):
        return CLUB_ALIASES.get(value.strip().lower(), value)
    # Normalizar códigos geográficos para maiúsculo (ISO2, UF, continente)
    if base in {"club_country_code", "club_state_code", "club_continent"} and isinstance(value, str):
        return value.strip().upper()
    return value


def _validate_filters(filters: Any) -> Tuple[Dict[str, Any], Optional[str]]:
    if filters is None:
        return {}, None
    if not isinstance(filters, dict):
        return {}, "filters_not_object"

    safe: Dict[str, Any] = {}
    for k, v in filters.items():
        ks = _normalize_filter_key(str(k))
        base = _filter_key_base(ks)
        if base not in ALLOWED_FILTER_BASE:
            continue  # skip silencioso; não aborta filtros válidos restantes

        # Expansão automática de alias de posição
        if base == "position_code":
            if ks.endswith("_in") and isinstance(v, list):
                # Expande cada item da lista: ["ponta","vol"] → ["PE","PD","VOL"]
                expanded_list: List[str] = []
                for item in v:
                    exp = expand_position_query(item)
                    if exp:
                        expanded_list.extend(exp)
                    elif isinstance(item, str) and item.strip().upper() in VALID_POSITION_CODES:
                        expanded_list.append(item.strip().upper())
                if expanded_list:
                    safe["position_code_in"] = list(dict.fromkeys(expanded_list))
                continue
            elif not ks.endswith("_in"):
                # Expansão de valor único: "ponta" → position_code_in: ["PE","PD"]
                expanded = expand_position_query(v)
                if expanded is not None:
                    if len(expanded) > 1:
                        safe["position_code_in"] = expanded
                    else:
                        safe["position_code_eq"] = expanded[0]
                    continue

        safe[ks] = _normalize_filter_value(ks, v)
    return safe, None


def _sanitize_rows(data: Any) -> Any:
    if not settings.strict_privacy:
        return data

    if data is None or isinstance(data, (str, int, float, bool)):
        return data

    if isinstance(data, list):
        return [_sanitize_rows(x) for x in data]

    if isinstance(data, dict):
        out = {}
        for k, v in data.items():
            key = str(k)
            if key.lower() in SENSITIVE_FIELDS:
                continue
            out[key] = _sanitize_rows(v)
        return out

    return data


def _mk_citations(dataset: str, query_id: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [{"type": dataset, "id": query_id}]


def _ok(data: Any, summary: str, citations: Optional[List[Any]] = None) -> Dict[str, Any]:
    return {"data": _sanitize_rows(data), "citations": citations or [], "summary": summary, "error": None}


def _err(summary: str, err_code: str, citations: Optional[List[Any]] = None) -> Dict[str, Any]:
    return {"data": None, "citations": citations or [], "summary": summary, "error": err_code}


def _normalize_columns(columns: Any) -> List[str]:
    if not isinstance(columns, list):
        columns = DEFAULT_PLAYER_COLUMNS

    safe_cols = []
    for c in columns:
        nc = _normalize_column(c)
        if nc in ALLOWED_COLUMNS and nc not in safe_cols:
            safe_cols.append(nc)

    if not safe_cols:
        safe_cols = DEFAULT_PLAYER_COLUMNS.copy()

    if "full_name" not in safe_cols:
        safe_cols.insert(0, "full_name")

    return safe_cols


def _project_rows(rows: List[Dict[str, Any]], columns: List[str], metric: Optional[str] = None) -> List[Dict[str, Any]]:
    cols = columns.copy()
    if metric and metric in ALLOWED_COLUMNS and metric not in cols:
        cols.append(metric)

    out = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        projected = {c: row.get(c) for c in cols}
        out.append(projected)
    return out


def _safe_import_transfer_queries():
    q = {}
    try:
        from app.db.queries.transfers import search_transfers as _st
        q["search_transfers"] = _st
    except Exception:
        q["search_transfers"] = None
    try:
        from app.db.queries.transfers import transfer_market_stats as _tms
        q["transfer_market_stats"] = _tms
    except Exception:
        q["transfer_market_stats"] = None
    try:
        from app.db.queries.transfers import top_clubs_by_transfers as _tcbt
        q["top_clubs_by_transfers"] = _tcbt
    except Exception:
        q["top_clubs_by_transfers"] = None
    try:
        from app.db.queries.transfers import transfer_trends as _tt
        q["transfer_trends"] = _tt
    except Exception:
        q["transfer_trends"] = None
    return q


def _safe_import_queries():
    q = {}

    try:
        from app.db.queries.players import search_players as _search_players
        q["search_players"] = _search_players
    except Exception:
        q["search_players"] = None

    try:
        from app.db.queries.players import get_player_profile as _get_player_profile
        q["get_player_profile"] = _get_player_profile
    except Exception:
        q["get_player_profile"] = None

    try:
        from app.db.queries.players import list_players_filtered as _list_players_filtered
        q["list_players_filtered"] = _list_players_filtered
    except Exception:
        q["list_players_filtered"] = None

    try:
        from app.db.queries.analytics import rank_players_by_metric as _rank
        q["rank_players_by_metric"] = _rank
    except Exception:
        q["rank_players_by_metric"] = None

    try:
        from app.db.queries.analytics import distribution_group_by as _dist
        q["distribution_group_by"] = _dist
    except Exception:
        q["distribution_group_by"] = None

    try:
        from app.db.queries.analytics import aggregate_metric as _agg
        q["aggregate_metric"] = _agg
    except Exception:
        q["aggregate_metric"] = None

    try:
        from app.db.queries.analytics import compare_clubs_metric as _cmp
        q["compare_clubs_metric"] = _cmp
    except Exception:
        q["compare_clubs_metric"] = None

    return q


_Q = _safe_import_queries()
_TQ = _safe_import_transfer_queries()


def tool_search_players(args: Dict[str, Any]) -> Dict[str, Any]:
    name = str(args.get("name", "")).strip()
    if not name:
        return _err("Parâmetro 'name' vazio.", "bad_args")

    limit = _clamp_int(args.get("limit"), default=10, min_v=1, max_v=50)

    fn = _Q.get("search_players")
    if not fn:
        return _err("Query search_players não implementada.", "not_implemented")

    players = fn(name, limit=limit)
    if not isinstance(players, list):
        players = []

    return _ok(
        players,
        f"{len(players)} jogador(es) encontrado(s) para '{name}'.",
        _mk_citations("players", "search_players", {"name": name, "limit": limit}),
    )


def tool_player_profile(args: Dict[str, Any]) -> Dict[str, Any]:
    query = str(args.get("query", "")).strip()
    if not query:
        return _err("Parâmetro 'query' vazio.", "bad_args")

    filters, ferr = _validate_filters(args.get("filters"))
    if ferr:
        return _err("Filtros inválidos.", ferr)

    fn = _Q.get("get_player_profile")
    if fn:
        data = fn(query=query, filters=filters)
        if isinstance(data, dict):
            data = [data]
        if not isinstance(data, list):
            data = []
        return _ok(
            data[:5],
            "Perfil/candidatos retornados.",
            _mk_citations("players", "player_profile", {"query": query, **filters}),
        )

    search_fn = _Q.get("search_players")
    if not search_fn:
        return _err("Queries de player não implementadas.", "not_implemented")

    players = search_fn(query, limit=5)
    return _ok(
        players,
        "Fallback de busca por nome.",
        _mk_citations("players", "player_profile_fallback", {"query": query, **filters}),
    )


def tool_list_players(args: Dict[str, Any]) -> Dict[str, Any]:
    filters, ferr = _validate_filters(args.get("filters"))
    if ferr:
        return _err("Filtros inválidos.", ferr)

    limit = _clamp_int(args.get("limit"), default=settings.default_limit_lists, min_v=1, max_v=500)
    columns = _normalize_columns(args.get("columns"))

    fn = _Q.get("list_players_filtered")
    if not fn:
        return _err("Query list_players_filtered não implementada.", "not_implemented")

    rows = fn(filters=filters, columns=columns, limit=limit)
    if not isinstance(rows, list):
        rows = []

    return _ok(
        rows,
        f"{len(rows)} jogador(es) listados.",
        _mk_citations("players", "list_players", {"filters": filters, "limit": limit, "columns": columns}),
    )


def tool_rank_players(args: Dict[str, Any]) -> Dict[str, Any]:
    metric = _normalize_metric(args.get("metric"))
    if metric not in ALLOWED_METRICS:
        return _err("Métrica inválida para ranking.", "metric_not_allowed")

    filters, ferr = _validate_filters(args.get("filters"))
    if ferr:
        return _err("Filtros inválidos.", ferr)

    order = str(args.get("order") or "desc").lower().strip()
    if order not in {"asc", "desc"}:
        order = "desc"

    limit = _clamp_int(args.get("limit"), default=settings.default_limit_rankings, min_v=1, max_v=100)
    columns = _normalize_columns(args.get("columns"))

    for base_col in ["known_as", "position_code", "age", "club_name", metric]:
        if base_col not in columns and base_col in ALLOWED_COLUMNS:
            columns.append(base_col)

    fn = _Q.get("rank_players_by_metric")
    if fn:
        rows = fn(metric=metric, filters=filters, order=order, limit=limit, columns=columns)
        if not isinstance(rows, list):
            rows = []

        rows = _project_rows(rows, columns, metric=metric)

        return _ok(
            rows,
            f"Ranking gerado ({len(rows)} linhas).",
            _mk_citations("players", "rank_players", {"filters": filters, "metric": metric, "order": order, "limit": limit}),
        )

    return _err("rank_players_by_metric não implementada.", "not_implemented")


def tool_distribution(args: Dict[str, Any]) -> Dict[str, Any]:
    group_by = _normalize_group_by(args.get("group_by"))
    if group_by not in ALLOWED_GROUP_BY:
        return _err("Campo inválido para distribuição.", "group_by_not_allowed")

    filters, ferr = _validate_filters(args.get("filters"))
    if ferr:
        return _err("Filtros inválidos.", ferr)

    fn = _Q.get("distribution_group_by")
    if not fn:
        return _err("distribution_group_by não implementada.", "not_implemented")

    result = fn(group_by=group_by, filters=filters, bins=args.get("bins"), metric=args.get("metric"))
    if not isinstance(result, list):
        result = []

    return _ok(
        result,
        "Distribuição calculada.",
        _mk_citations("players", "distribution", {"filters": filters, "group_by": group_by}),
    )


def tool_aggregate(args: Dict[str, Any]) -> Dict[str, Any]:
    metric = _normalize_metric(args.get("metric"))
    agg = str(args.get("agg", "")).strip().lower()
    group_by = args.get("group_by")

    if agg not in {"count", "sum", "avg", "min", "max", "median"}:
        return _err("Agregação inválida.", "agg_not_allowed")

    if group_by is not None:
        group_by = _normalize_group_by(group_by)

    filters, ferr = _validate_filters(args.get("filters"))
    if ferr:
        return _err("Filtros inválidos.", ferr)

    fn = _Q.get("aggregate_metric")
    if not fn:
        return _err("aggregate_metric não implementada.", "not_implemented")

    result = fn(metric=metric or "*", agg=agg, group_by=group_by, filters=filters)

    return _ok(
        result,
        "Agregação calculada.",
        _mk_citations("players", "aggregate", {"filters": filters, "metric": metric, "agg": agg, "group_by": group_by}),
    )


def tool_compare_clubs(args: Dict[str, Any]) -> Dict[str, Any]:
    metric = _normalize_metric(args.get("metric"))
    agg = str(args.get("agg", "")).strip().lower()
    peer_set = args.get("peer_set")

    filters, ferr = _validate_filters(args.get("filters"))
    if ferr:
        return _err("Filtros inválidos.", ferr)

    limit = _clamp_int(args.get("limit"), default=10, min_v=1, max_v=30)
    order = str(args.get("order") or "desc").lower().strip()
    if order not in {"asc", "desc"}:
        order = "desc"

    fn = _Q.get("compare_clubs_metric")
    if not fn:
        return _err("compare_clubs_metric não implementada.", "not_implemented")

    rows = fn(metric=metric or "player_count", agg=agg, peer_set=peer_set, filters=filters, limit=limit, order=order)
    if not isinstance(rows, list):
        rows = []

    return _ok(
        rows,
        "Comparação entre clubes calculada.",
        _mk_citations("players", "compare_clubs", {"filters": filters, "metric": metric, "agg": agg, "peer_set": peer_set, "limit": limit}),
    )


def tool_context_bundle(args: Dict[str, Any]) -> Dict[str, Any]:
    domain = str(args.get("domain") or "").strip().lower()
    filters, ferr = _validate_filters(args.get("filters"))
    if ferr:
        return _err("Filtros inválidos.", ferr)

    # only allow a fixed set of domain names to avoid surprises
    allowed_domains = {"players", "clubs", "squad", "market", "mixed", ""}
    if domain not in allowed_domains:
        return _err("Dominio inválido para contexto.", "invalid_domain")

    bundle: Dict[str, Any] = {"domain": domain, "filters": filters}

    list_fn = _Q.get("list_players_filtered")
    if list_fn:
        rows = list_fn(filters=filters, columns=DEFAULT_PLAYER_COLUMNS, limit=500)
        if isinstance(rows, list):
            bundle["players"] = rows

    return _ok(
        bundle,
        "Contexto agregado carregado.",
        _mk_citations("bundle", "context_bundle", {"domain": domain, "filters": filters}),
    )


def tool_inspect_schema(args: Dict[str, Any]) -> Dict[str, Any]:
    sql = """
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('Player', 'Club', 'Transfer')
    ORDER BY table_name, ordinal_position
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

    data = [
        {"table_name": r[0], "column_name": r[1], "data_type": r[2]}
        for r in rows
    ]

    return _ok(
        data,
        "Schema inspecionado.",
        _mk_citations("schema", "inspect_schema", {}),
    )


def _validate_readonly_sql(sql: str) -> Optional[str]:
    sql_clean = (sql or "").strip()
    if not sql_clean:
        return "empty_sql"

    if ";" in sql_clean.rstrip(";"):
        return "multiple_statements_not_allowed"

    upper_sql = sql_clean.upper()

    blocked = [
        "INSERT ",
        "UPDATE ",
        "DELETE ",
        "DROP ",
        "ALTER ",
        "TRUNCATE ",
        "CREATE ",
        "GRANT ",
        "REVOKE ",
        "MERGE ",
    ]
    for tok in blocked:
        if tok in upper_sql:
            return f"sql_not_readonly:{tok.strip()}"

    if not (upper_sql.startswith("SELECT") or upper_sql.startswith("WITH")):
        return "only_select_or_cte_allowed"

    return None


def tool_sql_readonly(args: Dict[str, Any]) -> Dict[str, Any]:
    sql = str(args.get("sql", "")).strip()
    params = dict(args.get("params") or {})
    limit = _clamp_int(args.get("limit"), default=100, min_v=1, max_v=1000)

    err = _validate_readonly_sql(sql)
    if err:
        return _err("SQL inválido para leitura.", err)

    if "limit" not in params and "LIMIT" not in sql.upper():
        sql = sql.rstrip(";") + "\nLIMIT %(limit)s"
        params["limit"] = limit

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SET LOCAL statement_timeout = '4000ms';")
                cur.execute(sql, params)
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description] if cur.description else []

        data = [dict(zip(cols, row)) for row in rows]
        return _ok(
            data,
            f"SQL readonly executado ({len(data)} linhas).",
            _mk_citations("sql", "sql_readonly", {"limit": limit}),
        )
    except Exception as e:
        return _err(f"Falha ao executar SQL readonly: {type(e).__name__}", f"sql_error:{type(e).__name__}")


def tool_player_financial(args: Dict[str, Any]) -> Dict[str, Any]:
    """Retorna perfil financeiro completo de um jogador do elenco Serrano."""
    query = str(args.get("query", "")).strip()
    if not query:
        return _err("Parâmetro 'query' vazio.", "bad_args")

    fn = _Q.get("get_player_profile")
    if not fn:
        return _err("Query get_player_profile não implementada.", "not_implemented")

    financial_columns = [
        "full_name", "known_as", "position_code", "age", "club_name",
        "market_value_mEUR", "serrano_ownership_pct", "serrano_rights_pct",
        "commission_pct", "first_option_value", "second_option_value",
        "prospection_value", "transfer_ref_value", "agency",
    ]

    data = fn(query=query, filters={})
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        data = []

    # Project only financial columns
    out = []
    for row in data[:5]:
        if isinstance(row, dict):
            out.append({c: row.get(c) for c in financial_columns if c in row or True})

    return _ok(
        out,
        f"Perfil financeiro retornado para '{query}'.",
        _mk_citations("players", "player_financial", {"query": query}),
    )


def tool_search_transfers(args: Dict[str, Any]) -> Dict[str, Any]:
    """Busca registros de transferência no mercado geral por nome de atleta e/ou posição."""
    atleta_nome = str(args.get("atleta_nome") or args.get("name") or "").strip()
    posicao = normalize_transfer_posicao(str(args.get("posicao") or args.get("position") or ""))
    limit = _clamp_int(args.get("limit"), default=20, min_v=1, max_v=100)

    if not atleta_nome and not posicao:
        return _err("Informe atleta_nome ou posicao.", "bad_args")

    fn = _TQ.get("search_transfers")
    if not fn:
        return _err("search_transfers não implementada.", "not_implemented")

    rows = fn(atleta_nome=atleta_nome, posicao=posicao, limit=limit)
    if not isinstance(rows, list):
        rows = []

    return _ok(
        rows,
        f"{len(rows)} transferência(s) encontrada(s).",
        _mk_citations("transfers", "search_transfers", {"atleta_nome": atleta_nome, "posicao": posicao}),
    )


def tool_transfer_market(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retorna estatísticas de mercado de transferências para um perfil de jogador.
    Use para benchmarking: compara um jogador do elenco Serrano com o que o mercado paga
    por jogadores de posição e faixa etária equivalentes.
    """
    posicao = normalize_transfer_posicao(str(args.get("posicao") or args.get("position") or ""))
    idade_min = args.get("idade_min") or args.get("age_min")
    idade_max = args.get("idade_max") or args.get("age_max")
    period_start = args.get("period_start")
    period_end = args.get("period_end")
    moeda = str(args.get("moeda") or "").strip()

    fn = _TQ.get("transfer_market_stats")
    if not fn:
        return _err("transfer_market_stats não implementada.", "not_implemented")

    result = fn(
        posicao=posicao,
        idade_min=int(idade_min) if idade_min is not None else None,
        idade_max=int(idade_max) if idade_max is not None else None,
        period_start=period_start,
        period_end=period_end,
        moeda=moeda,
    )

    if not isinstance(result, dict):
        return _err("Erro ao calcular estatísticas de mercado.", "query_error")

    summary_parts = []
    if posicao:
        summary_parts.append(f"posição={posicao}")
    if idade_min is not None or idade_max is not None:
        summary_parts.append(f"idade={idade_min or '?'}-{idade_max or '?'}")

    summary = f"Mercado: {result.get('total', 0)} transferências"
    if summary_parts:
        summary += f" ({', '.join(summary_parts)})"
    if result.get("median_valor") is not None:
        summary += f". Mediana={result['median_valor']} {result.get('moeda', '')}."

    return _ok(
        result,
        summary,
        _mk_citations("transfers", "transfer_market", {"posicao": posicao}),
    )


def tool_transfer_trends(args: Dict[str, Any]) -> Dict[str, Any]:
    """Agrupa transferências de mercado por campo para análise de tendências."""
    group_by = str(args.get("group_by") or "posicao").strip().lower()
    posicao = normalize_transfer_posicao(str(args.get("posicao") or ""))
    period_start = args.get("period_start")
    period_end = args.get("period_end")
    limit = _clamp_int(args.get("limit"), default=20, min_v=1, max_v=50)

    fn = _TQ.get("transfer_trends")
    if not fn:
        return _err("transfer_trends não implementada.", "not_implemented")

    rows = fn(group_by=group_by, period_start=period_start, period_end=period_end,
              posicao=posicao, limit=limit)
    if not isinstance(rows, list):
        rows = []

    return _ok(
        rows,
        f"Tendências de mercado por '{group_by}' ({len(rows)} grupos).",
        _mk_citations("transfers", "transfer_trends", {"group_by": group_by}),
    )


def tool_top_clubs_transfers(args: Dict[str, Any]) -> Dict[str, Any]:
    """Ranking de clubes por volume de transferências no mercado geral."""
    direction = str(args.get("direction") or "destino").strip().lower()
    posicao = normalize_transfer_posicao(str(args.get("posicao") or ""))
    period_start = args.get("period_start")
    period_end = args.get("period_end")
    limit = _clamp_int(args.get("limit"), default=15, min_v=1, max_v=30)

    fn = _TQ.get("top_clubs_by_transfers")
    if not fn:
        return _err("top_clubs_by_transfers não implementada.", "not_implemented")

    rows = fn(direction=direction, posicao=posicao,
              period_start=period_start, period_end=period_end, limit=limit)
    if not isinstance(rows, list):
        rows = []

    dir_label = {"destino": "compradores", "origem": "vendedores", "formador": "formadores"}.get(direction, direction)
    return _ok(
        rows,
        f"Top {len(rows)} clubes {dir_label} no mercado.",
        _mk_citations("transfers", "top_clubs_transfers", {"direction": direction}),
    )


def tool_position_market_comparison(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ferramenta composta: para uma posição, retorna em uma única chamada
    (1) jogadores do elenco Serrano nessa posição e
    (2) estatísticas do mercado de transferências para o termo equivalente.

    PE+PD → "ponta" no mercado; LD+LE → "lateral"; MEI+MC → "meia".
    """
    position_raw = str(args.get("position") or args.get("posicao") or "").strip()
    if not position_raw:
        return _err("Parâmetro 'position' ou 'posicao' obrigatório.", "bad_args")

    idade_min = args.get("idade_min") or args.get("age_min")
    idade_max = args.get("idade_max") or args.get("age_max")
    moeda = str(args.get("moeda") or "").strip()

    # --- Parte 1: jogadores do elenco Serrano ---
    expanded = expand_position_query(position_raw)
    squad_result: Dict[str, Any] = {}
    list_fn = _Q.get("list_players_filtered")
    if list_fn and expanded:
        squad_filters: Dict[str, Any] = {}
        if len(expanded) > 1:
            squad_filters["position_code_in"] = expanded
        else:
            squad_filters["position_code_eq"] = expanded[0]
        if idade_min is not None:
            squad_filters["age_gte"] = int(idade_min)
        if idade_max is not None:
            squad_filters["age_lte"] = int(idade_max)
        columns = [
            "full_name", "known_as", "position_code", "age", "club_name",
            "market_value_mEUR", "serrano_ownership_pct", "serrano_rights_pct",
        ]
        rows = list_fn(filters=squad_filters, columns=columns, limit=100)
        squad_result = {
            "codes": expanded,
            "count": len(rows) if isinstance(rows, list) else 0,
            "players": rows if isinstance(rows, list) else [],
        }

    # --- Parte 2: estatísticas do mercado geral ---
    market_posicao = normalize_transfer_posicao(position_raw)
    market_result: Dict[str, Any] = {}
    stats_fn = _TQ.get("transfer_market_stats")
    if stats_fn:
        result = stats_fn(
            posicao=market_posicao,
            idade_min=int(idade_min) if idade_min is not None else None,
            idade_max=int(idade_max) if idade_max is not None else None,
            moeda=moeda,
        )
        market_result = result if isinstance(result, dict) else {}

    combined = {
        "position_input": position_raw,
        "serrano_position_codes": expanded or [],
        "market_term": market_posicao,
        "squad": squad_result,
        "market_stats": market_result,
    }
    n_squad = squad_result.get("count", 0)
    n_market = market_result.get("total", 0)
    summary = (
        f"Comparação de posição '{position_raw}': "
        f"{n_squad} jogador(es) no elenco Serrano | "
        f"{n_market} transferência(s) no mercado (termo: '{market_posicao}')."
    )
    return _ok(
        combined,
        summary,
        _mk_citations("compound", "position_market_comparison",
                      {"position": position_raw, "market_term": market_posicao}),
    )


TOOLS_META: Dict[str, Dict[str, Any]] = {
    "search_players": {
        "description": "Busca jogadores por nome (usa `full_name` / `known_as`).",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "limit": {"type": "integer"},
            },
            "required": ["name"],
            "additionalProperties": False,
        },
        "handler": tool_search_players,
    },
    "player_profile": {
        "description": "Retorna perfil ou candidatos de jogador por `query` em full_name/known_as.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "filters": {"type": "object", "additionalProperties": True},
            },
            "required": ["query"],
            "additionalProperties": False,
        },
        "handler": tool_player_profile,
    },
    "list_players": {
        "description": (
            "Lista jogadores do elenco Serrano por filtros estruturados. "
            "USE ESTA FERRAMENTA para filtrar por agência (agency), clube (club_name), posição, faixa etária ou valor de mercado. "
            "NÃO use search_players para agência ou clube — search_players busca apenas por nome do jogador. "
            "Filtros principais: agency, club_name, position_code_eq, age_gte/lte, market_value_mEUR_gte/lte, serrano_ownership_pct_gte, nationality. "
            "Quando o usuário pedir 'todos os jogadores', use limit: 200 ou mais."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "filters": {"type": "object", "additionalProperties": True},
                "columns": {"type": "array", "items": {"type": "string"}},
                "limit": {"type": "integer"},
            },
            "additionalProperties": False,
        },
        "handler": tool_list_players,
    },
    "rank_players": {
        "description": "Gera ranking de jogadores por métrica numérica (age, market_value_mEUR, serrano_ownership_pct etc.).",
        "parameters": {
            "type": "object",
            "properties": {
                "metric": {"type": "string"},
                "filters": {"type": "object", "additionalProperties": True},
                "order": {"type": "string"},
                "limit": {"type": "integer"},
                "columns": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["metric"],
            "additionalProperties": False,
        },
        "handler": tool_rank_players,
    },
    "distribution": {
        "description": "Calcula distribuição por campo (group_by usa nomes canônicos).",
        "parameters": {
            "type": "object",
            "properties": {
                "group_by": {"type": "string"},
                "filters": {"type": "object", "additionalProperties": True},
                "bins": {"type": "array", "items": {"type": "number"}},
                "metric": {"type": "string"},
            },
            "required": ["group_by"],
            "additionalProperties": False,
        },
        "handler": tool_distribution,
    },
    "aggregate": {
        "description": "Agrega uma métrica numérica (count, sum, avg etc.) usando nomes canônicos.",
        "parameters": {
            "type": "object",
            "properties": {
                "metric": {"type": "string"},
                "agg": {"type": "string"},
                "group_by": {"type": "string"},
                "filters": {"type": "object", "additionalProperties": True},
            },
            "required": ["agg"],
            "additionalProperties": False,
        },
        "handler": tool_aggregate,
    },
    "compare_clubs": {
        "description": "Compara clubes por métrica agregada; utiliza club_name/club_id e métricas canônicas.",
        "parameters": {
            "type": "object",
            "properties": {
                "metric": {"type": "string"},
                "agg": {"type": "string"},
                "peer_set": {},
                "filters": {"type": "object", "additionalProperties": True},
                "limit": {"type": "integer"},
                "order": {"type": "string"},
            },
            "required": ["agg", "peer_set"],
            "additionalProperties": False,
        },
        "handler": tool_compare_clubs,
    },
    "context_bundle": {
        "description": "Carrega um contexto mais amplo de dados para análise; domain define o escopo e filtros usam nomes canônicos.",
        "parameters": {
            "type": "object",
            "properties": {
                "domain": {"type": "string"},
                "filters": {"type": "object", "additionalProperties": True},
            },
            "required": ["domain"],
            "additionalProperties": False,
        },
        "handler": tool_context_bundle,
    },
    "player_financial": {
        "description": "Retorna perfil financeiro completo de um jogador do ELENCO SERRANO: market_value_mEUR, serrano_ownership_pct, serrano_rights_pct, commission_pct, first_option_value, second_option_value, prospection_value, transfer_ref_value.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Nome ou parte do nome do jogador"},
            },
            "required": ["query"],
            "additionalProperties": False,
        },
        "handler": tool_player_financial,
    },
    "search_transfers": {
        "description": "Busca registros de transferência no MERCADO GERAL por nome de atleta e/ou posição. Use para encontrar histórico de transferências de um jogador específico no mercado.",
        "parameters": {
            "type": "object",
            "properties": {
                "atleta_nome": {"type": "string", "description": "Nome do atleta"},
                "posicao": {"type": "string", "description": "Posição (ex: atacante, meia, zagueiro)"},
                "limit": {"type": "integer"},
            },
            "additionalProperties": False,
        },
        "handler": tool_search_transfers,
    },
    "transfer_market": {
        "description": "Retorna estatísticas de valor do MERCADO GERAL de transferências (count, avg, median, min, max, P75) para um perfil de jogador (posição + faixa etária). Use para benchmarking: comparar jogador do elenco Serrano com o que o mercado paga por jogadores equivalentes.",
        "parameters": {
            "type": "object",
            "properties": {
                "posicao": {"type": "string", "description": "Posição do jogador"},
                "idade_min": {"type": "integer", "description": "Idade mínima"},
                "idade_max": {"type": "integer", "description": "Idade máxima"},
                "period_start": {"type": "string", "description": "Data início (YYYY-MM-DD)"},
                "period_end": {"type": "string", "description": "Data fim (YYYY-MM-DD)"},
                "moeda": {"type": "string", "description": "Moeda (ex: EUR, USD, BRL)"},
            },
            "additionalProperties": False,
        },
        "handler": tool_transfer_market,
    },
    "transfer_trends": {
        "description": "Agrupa transferências do MERCADO GERAL por campo (posicao, destino_pais, moeda, etc.) para análise de tendências. Use para entender volume e valores médios por posição, destino geográfico ou período.",
        "parameters": {
            "type": "object",
            "properties": {
                "group_by": {
                    "type": "string",
                    "description": "Campo de agrupamento: posicao | destino_pais | origem_clube | destino_clube | formador_clube | moeda",
                },
                "posicao": {"type": "string"},
                "period_start": {"type": "string", "description": "Data início (YYYY-MM-DD)"},
                "period_end": {"type": "string", "description": "Data fim (YYYY-MM-DD)"},
                "limit": {"type": "integer"},
            },
            "additionalProperties": False,
        },
        "handler": tool_transfer_trends,
    },
    "top_clubs_transfers": {
        "description": "Ranking de clubes por volume de transferências no MERCADO GERAL. direction='destino' = quem mais comprou, 'origem' = quem mais vendeu, 'formador' = clubes formadores mais produtivos.",
        "parameters": {
            "type": "object",
            "properties": {
                "direction": {"type": "string", "description": "destino | origem | formador"},
                "posicao": {"type": "string"},
                "period_start": {"type": "string"},
                "period_end": {"type": "string"},
                "limit": {"type": "integer"},
            },
            "additionalProperties": False,
        },
        "handler": tool_top_clubs_transfers,
    },
    "position_market_comparison": {
        "description": (
            "Ferramenta composta: retorna em UMA chamada (1) jogadores do elenco Serrano "
            "para uma posição e (2) estatísticas do MERCADO GERAL de transferências para "
            "o termo de posição equivalente. "
            "Use para: 'nossos pontas vs o mercado', 'benchmark de laterais', "
            "'vale vender nossos zagueiros agora?', 'como estão nossos meias vs mercado?'. "
            "Aceita position_codes Serrano (PE, PD, LD, LE, MEI, MC, ATA, GOL, VOL, ZAG) "
            "ou termos naturais ('ponta', 'lateral', 'meia', 'atacante', 'volante', "
            "'zagueiro', 'goleiro'). "
            "PE+PD colapsam para 'ponta' no mercado; LD+LE para 'lateral'; MEI+MC para 'meia'. "
            "O resultado contém squad.players (elenco) e market_stats (mediana, avg, P75 do mercado). "
            "Use market_stats.median_valor como referência para comparar com market_value_mEUR dos jogadores."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "position": {
                    "type": "string",
                    "description": (
                        "Posição ou código: 'PE', 'ponta', 'lateral', 'goleiro', 'ZAG', etc. "
                        "O sistema mapeia automaticamente para os códigos do elenco e o termo do mercado."
                    ),
                },
                "idade_min": {"type": "integer", "description": "Filtro de idade mínima (aplicado ao elenco e ao mercado)"},
                "idade_max": {"type": "integer", "description": "Filtro de idade máxima (aplicado ao elenco e ao mercado)"},
                "moeda": {"type": "string", "description": "Moeda para stats de mercado (EUR, USD, BRL)"},
            },
            "required": ["position"],
            "additionalProperties": False,
        },
        "handler": tool_position_market_comparison,
    },
    "inspect_schema": {
        "description": "Inspeciona tabelas e colunas disponíveis do banco para leitura.",
        "parameters": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        "handler": tool_inspect_schema,
    },
    "sql_readonly": {
        "description": "(fallback/último recurso) Executa SQL somente leitura (SELECT/CTE) no banco. Prefira usar as ferramentas semânticas antes de recorrer a esta função. Escreva queries com cuidado: nomes de tabela precisam de aspas em camelCase e colunas também.",
        "parameters": {
            "type": "object",
            "properties": {
                "sql": {"type": "string"},
                "params": {"type": "object", "additionalProperties": True},
                "limit": {"type": "integer"},
            },
            "required": ["sql"],
            "additionalProperties": False,
        },
        "handler": tool_sql_readonly,
    },
}


def tools_for_responses_api() -> List[Dict[str, Any]]:
    return [
        {
            "type": "function",
            "name": name,
            "description": meta["description"],
            "parameters": meta["parameters"],
            "strict": False,
        }
        for name, meta in TOOLS_META.items()
    ]


def run_tool(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    meta = TOOLS_META.get(name)
    if not meta:
        return _err("Tool não registrada.", "unknown_tool")

    handler: ToolHandler = meta["handler"]
    try:
        out = handler(args or {})
    except Exception as e:
        return _err(f"Falha ao executar tool: {type(e).__name__}", f"exception:{type(e).__name__}")

    if not isinstance(out, dict):
        return _err("Retorno inválido da tool.", "invalid_tool_return")

    out.setdefault("data", None)
    out.setdefault("citations", [])
    out.setdefault("summary", "")
    out.setdefault("error", None)
    out["data"] = _sanitize_rows(out.get("data"))
    return out