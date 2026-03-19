from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.db.conn import get_conn


DEFAULT_LIMIT = 10
MAX_LIMIT_SEARCH = 25
MAX_LIMIT_LIST = 500

OP_SUFFIXES = ("_in", "_eq", "_neq", "_gt", "_lt", "_lte", "_gte")

PLAYER_TABLE = '"Player"'
CLUB_TABLE = '"Club"'

BASE_FROM = f"""
FROM {PLAYER_TABLE} p
LEFT JOIN {CLUB_TABLE} c
    ON c."id" = p."clubeId"
"""

# cast seguro para altura
SAFE_HEIGHT_CM_EXPR = """
CASE
    WHEN p."altura" IS NULL THEN NULL
    WHEN trim(CAST(p."altura" AS TEXT)) = '' THEN NULL
    WHEN replace(trim(CAST(p."altura" AS TEXT)), ',', '.') ~ '^[0-9]+(\.[0-9]+)?$'
         AND ROUND((replace(trim(CAST(p."altura" AS TEXT)), ',', '.')::numeric) * 100)
             BETWEEN 100 AND 250
        THEN ROUND((replace(trim(CAST(p."altura" AS TEXT)), ',', '.')::numeric) * 100)::INT
    ELSE NULL
END
"""

LOGICAL_FIELD_MAP: Dict[str, str] = {
    # --- Identidade ---
    "id": 'p."id"',
    "full_name": 'p."nome"',
    "known_as": 'p."nome"',
    "position_code": 'p."posicao"',
    "age": 'p."idade"',
    "birth_year": 'p."anoNascimento"',
    "height_cm": SAFE_HEIGHT_CM_EXPR,
    "dominant_foot": 'p."peDominante"',
    "nationality": 'p."nacionalidade"',
    "jersey_number": 'p."numeroCamisa"',
    "city": 'p."cidade"',
    # --- Clube ---
    "club_id": 'p."clubeId"',
    "club_name": 'c."nome"',
    "club": 'c."nome"',
    # --- Localização do Clube ---
    "club_country_code": 'c."countryCode"',
    "club_country_name": 'c."countryName"',
    "club_state_code":   'c."stateCode"',
    "club_state_name":   'c."stateName"',
    "club_location_city":'c."city"',
    "club_continent":    'c."continentCode"',
    # --- Mercado / valor ---
    "market_value_mEUR": 'p."valorMercado"',
    "serrano_ownership_pct": 'p."possePct"',
    "serrano_rights_pct": 'p."direitosSerrano"',
    "commission_pct": 'p."comissao"',
    "prospection_value": 'p."valorProsp"',
    "transfer_ref_value": 'p."valorTransfRef"',
    # --- Representação ---
    "agency": 'p."empresario"',
    # --- Flags booleanas ---
    "national_team_called": (
        'CASE WHEN p."selecao" IS NOT NULL'
        " AND trim(p.\"selecao\"::text) NOT IN ('null', '[]', '{}', '')"
        ' THEN TRUE ELSE FALSE END'
    ),
    "european_passport": (
        'CASE WHEN p."passaporte" IS NOT NULL'
        " AND trim(p.\"passaporte\"::text) NOT IN ('null', '[]', '{}', '')"
        ' THEN TRUE ELSE FALSE END'
    ),
    "has_cpf": 'CASE WHEN p."cpf" IS NOT NULL AND trim(CAST(p."cpf" AS TEXT)) != \'\' THEN TRUE ELSE FALSE END',
    # --- Conteúdo raw de campos JSON (output only, não filtráveis) ---
    "passaporte_raw": 'p."passaporte"',
    "selecao_raw": 'p."selecao"',
}

ALLOWED_OUTPUT_COLUMNS = set(LOGICAL_FIELD_MAP.keys())

FILTERABLE_FIELDS = {
    "id",
    "full_name",
    "known_as",
    "position_code",
    "age",
    "birth_year",
    "height_cm",
    "dominant_foot",
    "club_id",
    "club_name",
    "club",
    "market_value_mEUR",
    "serrano_ownership_pct",
    "serrano_rights_pct",
    "commission_pct",
    "first_option_value",
    "second_option_value",
    "prospection_value",
    "transfer_ref_value",
    "agency",
    "nationality",
    "national_team_called",
    "european_passport",
    "has_cpf",
    # Localização do Clube
    "club_country_code",
    "club_country_name",
    "club_state_code",
    "club_state_name",
    "club_location_city",
    "club_continent",
}

NUMERIC_FIELDS = {
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
}

GROUPABLE_FIELDS = {
    "position_code",
    "club_id",
    "club_name",
    "club",
    "agency",
    "nationality",
    "dominant_foot",
    "age",
    "birth_year",
    "height_cm",
    "national_team_called",
    "european_passport",
    "has_cpf",
}

NUMERIC_LOGICAL_FIELDS = NUMERIC_FIELDS
GROUPABLE_LOGICAL_FIELDS = GROUPABLE_FIELDS

# Campos geográficos do clube — código ISO (match exato, case-insensitive via UPPER)
GEO_CODE_FIELDS = {"club_country_code", "club_state_code", "club_continent"}
# Campos geográficos do clube — nome textual (ILIKE sem wildcard)
GEO_NAME_FIELDS = {"club_country_name", "club_state_name", "club_location_city"}

COUNTABLE_LOGICAL_FIELDS = {
    "id",
    "full_name",
    "known_as",
    "position_code",
    "club_id",
    "club_name",
    "club",
    "agency",
    "nationality",
    "market_value_mEUR",
    "serrano_ownership_pct",
    "serrano_rights_pct",
    "commission_pct",
    "first_option_value",
    "prospection_value",
}


def _quote_ident(name: str) -> str:
    name = str(name or "").replace('"', "")
    return f'"{name}"'


def _logical_to_sql_expr(logical_field: str) -> Optional[str]:
    return LOGICAL_FIELD_MAP.get(str(logical_field or "").strip())


def _logical_to_output_label(logical_field: str) -> str:
    return str(logical_field or "").strip()


def _build_base_from() -> str:
    return BASE_FROM


def _clamp_int(value: Any, default: int, min_v: int, max_v: int) -> int:
    try:
        value = int(value)
    except (ValueError, TypeError):
        value = default
    return max(min_v, min(max_v, value))


def _filter_base(key: str) -> str:
    key = str(key or "").strip()
    for suffix in OP_SUFFIXES:
        if key.endswith(suffix):
            return key[: -len(suffix)]
    return key


def _run_query(sql: str, params: Dict[str, Any]) -> List[Tuple[Any, ...]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SET LOCAL statement_timeout = '3000ms';")
            cur.execute(sql, params)
            return cur.fetchall()


def _is_textual_field(base: str) -> bool:
    return base in {
        "full_name",
        "known_as",
        "position_code",
        "club_name",
        "club",
        "agency",
        "nationality",
        "dominant_foot",
    }


def _is_boolish_field(base: str) -> bool:
    return base in {"national_team_called", "european_passport", "has_cpf"}


def _coerce_bool(value: Any) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    s = str(value).strip().lower()
    if s in {"true", "1", "sim", "yes"}:
        return True
    if s in {"false", "0", "nao", "não", "no"}:
        return False
    return None


def _build_filters_sql(filters: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    clauses: List[str] = []
    params: Dict[str, Any] = {}

    if not filters:
        return "", params

    param_idx = 0

    for raw_key, raw_value in (filters or {}).items():
        key = str(raw_key or "").strip()
        if not key or raw_value is None:
            continue

        base = _filter_base(key)
        if base not in FILTERABLE_FIELDS:
            continue

        expr = _logical_to_sql_expr(base)
        if not expr:
            continue

        param_name = f"p{param_idx}"
        param_idx += 1

        if key.endswith("_in"):
            if not isinstance(raw_value, list) or not raw_value:
                continue
            clauses.append(f"{expr} = ANY(%({param_name})s)")
            params[param_name] = raw_value
            continue

        if key.endswith("_eq"):
            clauses.append(f"{expr} = %({param_name})s")
            params[param_name] = raw_value
            continue

        if key.endswith("_neq"):
            # IS DISTINCT FROM trata NULL corretamente:
            # NULL IS DISTINCT FROM 'BR' → TRUE (inclui clube sem país cadastrado)
            clauses.append(f"({expr} IS DISTINCT FROM %({param_name})s)")
            params[param_name] = raw_value
            continue

        if key.endswith("_gt"):
            clauses.append(f"{expr} > %({param_name})s")
            params[param_name] = raw_value
            continue

        if key.endswith("_lt"):
            clauses.append(f"{expr} < %({param_name})s")
            params[param_name] = raw_value
            continue

        if key.endswith("_gte"):
            clauses.append(f"{expr} >= %({param_name})s")
            params[param_name] = raw_value
            continue

        if key.endswith("_lte"):
            clauses.append(f"{expr} <= %({param_name})s")
            params[param_name] = raw_value
            continue

        if _is_boolish_field(base):
            bv = _coerce_bool(raw_value)
            if bv is None:
                continue
            clauses.append(f"{expr} = %({param_name})s")
            params[param_name] = bv
            continue

        if base in NUMERIC_FIELDS:
            try:
                if "." in str(raw_value):
                    params[param_name] = float(raw_value)
                else:
                    params[param_name] = int(raw_value)
                clauses.append(f"{expr} = %({param_name})s")
            except Exception:
                continue
            continue

        if base in GEO_CODE_FIELDS:
            clauses.append(f"UPPER({expr}) = UPPER(%({param_name})s)")
            params[param_name] = str(raw_value).strip().upper()
            continue

        if base in GEO_NAME_FIELDS:
            # match exato acento-insensível (sem wildcard)
            clauses.append(f"unaccent({expr}) ILIKE unaccent(%({param_name})s)")
            params[param_name] = str(raw_value).strip()
            continue

        if _is_textual_field(base):
            if base in {"full_name", "known_as", "club_name", "club", "agency", "nationality"}:
                clauses.append(f"unaccent({expr}) ILIKE unaccent(%({param_name})s)")
                params[param_name] = f"%{str(raw_value).strip()}%"
            else:
                clauses.append(f"{expr} = %({param_name})s")
                params[param_name] = str(raw_value).strip()
            continue

    if not clauses:
        return "", params

    return " WHERE " + " AND ".join(clauses), params


def _build_select_parts(columns: Optional[List[str]]) -> Tuple[List[str], List[str]]:
    wanted = columns or ["id", "full_name", "position_code", "club_name", "market_value_mEUR"]

    parts: List[str] = []
    labels: List[str] = []
    seen = set()

    for col in wanted:
        logical = str(col or "").strip()
        if logical not in ALLOWED_OUTPUT_COLUMNS or logical in seen:
            continue

        expr = _logical_to_sql_expr(logical)
        if not expr:
            continue

        label = _logical_to_output_label(logical)
        parts.append(f"{expr} AS {_quote_ident(label)}")
        labels.append(label)
        seen.add(logical)

    if not parts:
        defaults = ["id", "full_name", "position_code", "club_name", "market_value_mEUR"]
        for col in defaults:
            expr = _logical_to_sql_expr(col)
            if expr:
                label = _logical_to_output_label(col)
                parts.append(f"{expr} AS {_quote_ident(label)}")
                labels.append(label)

    return parts, labels


def _rows_to_dicts(rows: List[Tuple[Any, ...]], labels: List[str]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for row in rows:
        out.append({labels[i]: row[i] for i in range(len(labels))})
    return out


def search_players(name: str, limit: int = DEFAULT_LIMIT) -> List[Dict[str, Any]]:
    name = str(name or "").strip()
    if not name:
        return []

    limit = _clamp_int(limit, default=DEFAULT_LIMIT, min_v=1, max_v=MAX_LIMIT_SEARCH)

    columns = ["full_name", "known_as", "position_code", "club_name", "market_value_mEUR", "age"]
    select_parts, labels = _build_select_parts(columns)

    sql = f"""
        SELECT {", ".join(select_parts)}
        {_build_base_from()}
        WHERE unaccent(p."nome") ILIKE unaccent(%(name)s)
        ORDER BY p."nome" ASC
        LIMIT %(limit)s
    """

    rows = _run_query(sql, {"name": f"%{name}%", "limit": limit})
    return _rows_to_dicts(rows, labels)


def get_player_profile(query: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    query = str(query or "").strip()
    if not query:
        return []

    filters = dict(filters or {})
    where_sql, params = _build_filters_sql(filters)

    name_expr = _logical_to_sql_expr("full_name")
    params["query"] = f"%{query}%"

    if where_sql:
        where_sql = f"{where_sql} AND unaccent({name_expr}) ILIKE unaccent(%(query)s)"
    else:
        where_sql = f" WHERE unaccent({name_expr}) ILIKE unaccent(%(query)s)"

    select_parts, labels = _build_select_parts(
        [
            "id",
            "full_name",
            "known_as",
            "position_code",
            "age",
            "birth_year",
            "club_name",
            "agency",
            "market_value_mEUR",
            "serrano_ownership_pct",
            "dominant_foot",
            "nationality",
            "european_passport",
            "national_team_called",
            "passaporte_raw",
            "selecao_raw",
            "has_cpf",
            # height_cm removido daqui até estabilizar os dados
        ]
    )

    sql = f"""
        SELECT {", ".join(select_parts)}
        {_build_base_from()}
        {where_sql}
        ORDER BY p."nome" ASC
        LIMIT 5
    """

    rows = _run_query(sql, params)
    return _rows_to_dicts(rows, labels)


def list_players_filtered(
    filters: Dict[str, Any],
    columns: Optional[List[str]] = None,
    limit: int = 25,
) -> List[Dict[str, Any]]:
    filters = dict(filters or {})
    limit = _clamp_int(limit, default=25, min_v=1, max_v=MAX_LIMIT_LIST)

    select_parts, labels = _build_select_parts(columns)
    where_sql, params = _build_filters_sql(filters)
    params["limit"] = limit

    sql = f"""
        SELECT {", ".join(select_parts)}
        {_build_base_from()}
        {where_sql}
        ORDER BY p."nome" ASC
        LIMIT %(limit)s
    """

    rows = _run_query(sql, params)
    return _rows_to_dicts(rows, labels)