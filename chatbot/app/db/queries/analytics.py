from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.db.conn import get_conn
from app.db.queries.players import (
    _quote_ident,
    _clamp_int,
    _logical_to_sql_expr,
    _logical_to_output_label,
    _build_base_from,
    _build_filters_sql,
    NUMERIC_LOGICAL_FIELDS,
    GROUPABLE_LOGICAL_FIELDS,
    COUNTABLE_LOGICAL_FIELDS,
)

DEFAULT_LIMIT = 10
MAX_LIMIT = 100

SUPPORTED_AGGS = {"count", "sum", "avg", "min", "max", "median"}
SUPPORTED_ORDER = {"asc", "desc"}


def _run_query(sql: str, params: Dict[str, Any]) -> List[Tuple[Any, ...]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SET LOCAL statement_timeout = '3000ms';")
            cur.execute(sql, params)
            return cur.fetchall()


def _require_expr(logical: str) -> str:
    expr = _logical_to_sql_expr(logical)
    if not expr:
        raise ValueError(f"field_not_supported_by_schema:{logical}")
    return expr


def _build_select_parts(columns: Optional[List[str]], metric: Optional[str] = None) -> Tuple[List[str], List[str]]:
    base_cols = columns or [
        "id",
        "full_name",
        "known_as",
        "position_code",
        "club_name",
        "market_value_mEUR",
        "serrano_ownership_pct",
        "age",
        "birth_year",
        "height_cm",
    ]

    if metric and metric not in base_cols:
        base_cols.append(metric)

    parts: List[str] = []
    labels: List[str] = []
    seen = set()

    for logical in base_cols:
        logical = str(logical or "").strip()
        if not logical or logical in seen:
            continue
        expr = _logical_to_sql_expr(logical)
        if not expr:
            continue
        label = _logical_to_output_label(logical)
        parts.append(f"{expr} AS {_quote_ident(label)}")
        labels.append(label)
        seen.add(logical)

    if not parts:
        fallback = ["full_name", "position_code", "market_value_mEUR", "age"]
        for logical in fallback:
            expr = _logical_to_sql_expr(logical)
            if expr:
                label = _logical_to_output_label(logical)
                parts.append(f"{expr} AS {_quote_ident(label)}")
                labels.append(label)

    return parts, labels


def rank_players_by_metric(
    metric: str,
    filters: Optional[Dict[str, Any]] = None,
    order: str = "desc",
    limit: int = 10,
    columns: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    metric = str(metric or "").strip()
    order = str(order or "desc").lower().strip()
    if order not in SUPPORTED_ORDER:
        order = "desc"

    if metric not in NUMERIC_LOGICAL_FIELDS:
        raise ValueError(f"metric_not_rankable:{metric}")

    metric_expr = _require_expr(metric)
    full_name_expr = _logical_to_sql_expr("full_name") or "1"

    select_parts, labels = _build_select_parts(columns, metric=metric)
    from_sql = _build_base_from()
    where_sql, params = _build_filters_sql(filters or {})

    limit = _clamp_int(limit, default=DEFAULT_LIMIT, min_v=1, max_v=MAX_LIMIT)
    params["limit"] = limit

    sql = f"""
        SELECT {", ".join(select_parts)}
        {from_sql}
        {where_sql}
        ORDER BY {metric_expr} {order.upper()} NULLS LAST, {full_name_expr} ASC
        LIMIT %(limit)s
    """

    rows = _run_query(sql, params)
    out: List[Dict[str, Any]] = []
    for row in rows:
        out.append({labels[i]: row[i] for i in range(len(labels))})
    return out


def distribution_group_by(
    group_by: str,
    filters: Optional[Dict[str, Any]] = None,
    bins: Optional[List[Any]] = None,
    metric: Optional[str] = None,
) -> List[Dict[str, Any]]:
    group_by = str(group_by or "").strip()
    if group_by not in GROUPABLE_LOGICAL_FIELDS:
        raise ValueError(f"group_by_not_supported:{group_by}")

    group_expr = _require_expr(group_by)
    from_sql = _build_base_from()
    where_sql, params = _build_filters_sql(filters or {})

    if bins:
        if group_by not in NUMERIC_LOGICAL_FIELDS:
            raise ValueError(f"bins_not_allowed_for_non_numeric:{group_by}")
        if not isinstance(bins, list) or len(bins) < 2:
            raise ValueError("bins_invalid")

        out: List[Dict[str, Any]] = []
        for idx in range(len(bins) - 1):
            low = bins[idx]
            high = bins[idx + 1]

            bucket_params = dict(params)
            bucket_params[f"b{idx}_low"] = low
            bucket_params[f"b{idx}_high"] = high

            extra = f"{group_expr} >= %(b{idx}_low)s AND {group_expr} < %(b{idx}_high)s"
            bucket_where = where_sql
            if bucket_where:
                bucket_where += f" AND {extra}"
            else:
                bucket_where = f" WHERE {extra}"

            sql = f"""
                SELECT COUNT(*) AS count_value
                {from_sql}
                {bucket_where}
            """
            rows = _run_query(sql, bucket_params)
            count_val = rows[0][0] if rows else 0

            out.append(
                {
                    "bucket": f"{low}–{high}",
                    "bucket_start": low,
                    "bucket_end": high,
                    "count": count_val,
                }
            )

        return out

    sql = f"""
        SELECT
            {group_expr} AS group_value,
            COUNT(*) AS count_value
        {from_sql}
        {where_sql}
        GROUP BY {group_expr}
        ORDER BY count_value DESC, group_value ASC
    """

    rows = _run_query(sql, params)

    label = _logical_to_output_label(group_by)
    return [
        {
            "group": r[0],
            label: r[0],
            "count": r[1],
        }
        for r in rows
    ]


def aggregate_metric(
    metric: str,
    agg: str,
    group_by: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any] | List[Dict[str, Any]]:
    metric = str(metric or "").strip()
    agg = str(agg or "").strip().lower()

    if agg not in SUPPORTED_AGGS:
        raise ValueError(f"agg_not_supported:{agg}")

    if agg == "count":
        if metric not in COUNTABLE_LOGICAL_FIELDS and metric != "*":
            raise ValueError(f"metric_not_countable:{metric}")
        metric_expr = "*" if metric == "*" else _require_expr(metric)
    else:
        if metric not in NUMERIC_LOGICAL_FIELDS:
            raise ValueError(f"metric_not_numeric:{metric}")
        metric_expr = _require_expr(metric)

    if agg == "median":
        agg_expr = f"PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY {metric_expr})"
    elif agg == "count" and metric == "*":
        agg_expr = "COUNT(*)"
    else:
        agg_expr = f"{agg.upper()}({metric_expr})"

    from_sql = _build_base_from()
    where_sql, params = _build_filters_sql(filters or {})

    if not group_by:
        sql = f"""
            SELECT {agg_expr} AS value
            {from_sql}
            {where_sql}
        """
        rows = _run_query(sql, params)
        return {"value": rows[0][0] if rows else None}

    group_by = str(group_by).strip()
    if group_by not in GROUPABLE_LOGICAL_FIELDS:
        raise ValueError(f"group_by_not_supported:{group_by}")

    group_expr = _require_expr(group_by)
    label = _logical_to_output_label(group_by)

    sql = f"""
        SELECT
            {group_expr} AS group_value,
            {agg_expr} AS value
        {from_sql}
        {where_sql}
        GROUP BY {group_expr}
        ORDER BY value DESC NULLS LAST, group_value ASC
    """

    rows = _run_query(sql, params)
    return [{"group": r[0], label: r[0], "value": r[1]} for r in rows]


def compare_clubs_metric(
    metric: str,
    agg: str,
    peer_set: Any,
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 10,
    order: str = "desc",
) -> List[Dict[str, Any]]:
    club_name_expr = _require_expr("club_name")
    club_id_expr = _logical_to_sql_expr("club_id")

    agg = str(agg or "").strip().lower()
    if agg not in SUPPORTED_AGGS:
        raise ValueError(f"agg_not_supported:{agg}")

    order = str(order or "desc").lower().strip()
    if order not in SUPPORTED_ORDER:
        order = "desc"

    filters = dict(filters or {})
    where_sql, params = _build_filters_sql(filters)

    extra_clauses = []
    if peer_set not in (None, "ALL", "default"):
        if isinstance(peer_set, list) and peer_set:
            if all(isinstance(x, int) for x in peer_set) and club_id_expr:
                extra_clauses.append(f"{club_id_expr} = ANY(%(peer_ids)s)")
                params["peer_ids"] = peer_set
            else:
                extra_clauses.append(f"{club_name_expr} = ANY(%(peer_names)s)")
                params["peer_names"] = [str(x) for x in peer_set]

    if extra_clauses:
        if where_sql:
            where_sql += " AND " + " AND ".join(extra_clauses)
        else:
            where_sql = " WHERE " + " AND ".join(extra_clauses)

    if agg == "count":
        metric_expr = "*" if metric in {"*", "player_count"} else _require_expr(metric)
        agg_expr = "COUNT(*)" if metric in {"*", "player_count"} else f"COUNT({metric_expr})"
    else:
        if metric not in NUMERIC_LOGICAL_FIELDS:
            raise ValueError(f"metric_not_numeric_for_compare:{metric}")
        metric_expr = _require_expr(metric)
        if agg == "median":
            agg_expr = f"PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY {metric_expr})"
        else:
            agg_expr = f"{agg.upper()}({metric_expr})"

    limit = _clamp_int(limit, default=DEFAULT_LIMIT, min_v=1, max_v=30)
    params["limit"] = limit

    select_club_id = f"{club_id_expr} AS club_id," if club_id_expr else ""
    group_by_parts = [x for x in [club_id_expr, club_name_expr] if x]
    if not group_by_parts:
        raise ValueError("missing_group_by_parts_for_compare_clubs")

    sql = f"""
        SELECT
            {select_club_id}
            {club_name_expr} AS club_name,
            {agg_expr} AS value
        {_build_base_from()}
        {where_sql}
        GROUP BY {", ".join(group_by_parts)}
        ORDER BY value {order.upper()} NULLS LAST, {club_name_expr} ASC
        LIMIT %(limit)s
    """

    rows = _run_query(sql, params)

    out = []
    for r in rows:
        if club_id_expr:
            out.append({"club_id": r[0], "club_name": r[1], "value": r[2]})
        else:
            out.append({"club_name": r[0], "value": r[1]})
    return out