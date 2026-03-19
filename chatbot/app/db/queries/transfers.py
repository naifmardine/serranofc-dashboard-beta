from __future__ import annotations

"""
Queries para a tabela Transferencia — representa o MERCADO GERAL de transferências,
não o elenco do Serrano FC. Use estas funções para buscar contexto de preço de
mercado, destinos, origens e volume de negociações.
"""

from typing import Any, Dict, List, Optional, Tuple

from app.db.conn import get_conn

TRANSFER_TABLE = '"Transferencia"'

DEFAULT_LIMIT = 20
MAX_LIMIT = 200

SUPPORTED_ORDER = {"asc", "desc"}
SUPPORTED_AGGS = {"count", "sum", "avg", "min", "max", "median"}

# Campos textuais disponíveis para agrupamento/filtro
GROUPABLE_FIELDS = {
    "posicao",          # atletaPosicao
    "destino_pais",     # paisClubeDestino
    "origem_clube",     # clubeOrigem
    "destino_clube",    # clubeDestino
    "formador_clube",   # clubeFormador
    "moeda",            # moeda
}

# Expressões SQL por campo lógico
FIELD_MAP: Dict[str, str] = {
    "id":               't."id"',
    "atleta_nome":      't."atletaNome"',
    "atleta_idade":     't."atletaIdade"',
    "posicao":          't."atletaPosicao"',
    "formador_clube":   't."clubeFormador"',
    "formador_pais":    't."paisClubeFormador"',
    "origem_clube":     't."clubeOrigem"',
    "destino_clube":    't."clubeDestino"',
    "destino_cidade":   't."cidadeClubeDestino"',
    "destino_pais":     't."paisClubeDestino"',
    "data":             't."dataTransferencia"',
    "valor":            't."valor"',
    "moeda":            't."moeda"',
    "fonte":            't."fonte"',
    "criado_em":        't."criadoEm"',
}

# Colunas padrão ao retornar registros
DEFAULT_COLUMNS = [
    "atleta_nome",
    "atleta_idade",
    "posicao",
    "origem_clube",
    "destino_clube",
    "destino_pais",
    "data",
    "valor",
    "moeda",
]


def _clamp_int(value: Any, default: int, min_v: int, max_v: int) -> int:
    try:
        value = int(value)
    except (ValueError, TypeError):
        value = default
    return max(min_v, min(max_v, value))


def _run_query(sql: str, params: Dict[str, Any]) -> List[Tuple[Any, ...]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SET LOCAL statement_timeout = '4000ms';")
            cur.execute(sql, params)
            return cur.fetchall()


def _rows_to_dicts(rows: List[Tuple[Any, ...]], labels: List[str]) -> List[Dict[str, Any]]:
    return [{labels[i]: row[i] for i in range(len(labels))} for row in rows]


def _build_select_parts(columns: Optional[List[str]] = None) -> Tuple[List[str], List[str]]:
    cols = columns or DEFAULT_COLUMNS
    parts: List[str] = []
    labels: List[str] = []
    seen = set()
    for col in cols:
        col = str(col or "").strip()
        if col in seen or col not in FIELD_MAP:
            continue
        parts.append(f"{FIELD_MAP[col]} AS \"{col}\"")
        labels.append(col)
        seen.add(col)
    return parts, labels


def search_transfers(
    atleta_nome: str = "",
    posicao: str = "",
    limit: int = DEFAULT_LIMIT,
) -> List[Dict[str, Any]]:
    """Busca registros de transferência por nome de atleta e/ou posição."""
    limit = _clamp_int(limit, default=DEFAULT_LIMIT, min_v=1, max_v=MAX_LIMIT)

    parts, labels = _build_select_parts()

    clauses: List[str] = []
    params: Dict[str, Any] = {"limit": limit}

    atleta_nome = str(atleta_nome or "").strip()
    posicao = str(posicao or "").strip()

    if atleta_nome:
        clauses.append('t."atletaNome" ILIKE %(nome)s')
        params["nome"] = f"%{atleta_nome}%"

    if posicao:
        clauses.append('t."atletaPosicao" ILIKE %(posicao)s')
        params["posicao"] = f"%{posicao}%"

    where = " WHERE " + " AND ".join(clauses) if clauses else ""

    sql = f"""
        SELECT {", ".join(parts)}
        FROM {TRANSFER_TABLE} t
        {where}
        ORDER BY t."dataTransferencia" DESC NULLS LAST, t."atletaNome" ASC
        LIMIT %(limit)s
    """

    rows = _run_query(sql, params)
    return _rows_to_dicts(rows, labels)


def transfer_market_stats(
    posicao: str = "",
    idade_min: Optional[int] = None,
    idade_max: Optional[int] = None,
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
    moeda: str = "",
    limit: int = 100,
) -> Dict[str, Any]:
    """
    Retorna estatísticas de valor de mercado para um perfil de jogador.
    Calcula count, avg, median, min, max e P75 de valor de transferência.
    Use para benchmarking de jogadores do elenco Serrano contra o mercado.
    """
    limit = _clamp_int(limit, default=100, min_v=1, max_v=MAX_LIMIT)

    clauses: List[str] = ['t."valor" IS NOT NULL', 't."valor" > 0']
    params: Dict[str, Any] = {}

    posicao = str(posicao or "").strip()
    moeda = str(moeda or "").strip()

    if posicao:
        clauses.append('t."atletaPosicao" ILIKE %(posicao)s')
        params["posicao"] = f"%{posicao}%"

    if idade_min is not None:
        clauses.append('t."atletaIdade" >= %(idade_min)s')
        params["idade_min"] = int(idade_min)

    if idade_max is not None:
        clauses.append('t."atletaIdade" <= %(idade_max)s')
        params["idade_max"] = int(idade_max)

    if period_start:
        clauses.append('t."dataTransferencia" >= %(period_start)s')
        params["period_start"] = period_start

    if period_end:
        clauses.append('t."dataTransferencia" <= %(period_end)s')
        params["period_end"] = period_end

    if moeda:
        clauses.append('t."moeda" = %(moeda)s')
        params["moeda"] = moeda.upper()

    where = " WHERE " + " AND ".join(clauses)

    sql = f"""
        SELECT
            COUNT(*)                                                     AS total,
            ROUND(AVG(t."valor")::numeric, 2)                           AS avg_valor,
            ROUND(MIN(t."valor")::numeric, 2)                           AS min_valor,
            ROUND(MAX(t."valor")::numeric, 2)                           AS max_valor,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP
                  (ORDER BY t."valor")::numeric, 2)                     AS median_valor,
            ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP
                  (ORDER BY t."valor")::numeric, 2)                     AS p75_valor,
            t."moeda"                                                    AS moeda
        FROM {TRANSFER_TABLE} t
        {where}
        GROUP BY t."moeda"
        ORDER BY total DESC
        LIMIT 5
    """

    rows = _run_query(sql, params)

    if not rows:
        return {
            "total": 0,
            "avg_valor": None,
            "median_valor": None,
            "min_valor": None,
            "max_valor": None,
            "p75_valor": None,
            "moeda": None,
            "filters": {"posicao": posicao, "idade_min": idade_min, "idade_max": idade_max},
        }

    # Retorna o grupo com mais registros (geralmente a moeda principal)
    r = rows[0]
    return {
        "total": r[0],
        "avg_valor": float(r[1]) if r[1] is not None else None,
        "min_valor": float(r[2]) if r[2] is not None else None,
        "max_valor": float(r[3]) if r[3] is not None else None,
        "median_valor": float(r[4]) if r[4] is not None else None,
        "p75_valor": float(r[5]) if r[5] is not None else None,
        "moeda": r[6],
        "all_currencies": [
            {
                "total": row[0],
                "avg_valor": float(row[1]) if row[1] is not None else None,
                "median_valor": float(row[4]) if row[4] is not None else None,
                "moeda": row[6],
            }
            for row in rows
        ],
        "filters": {
            "posicao": posicao or None,
            "idade_min": idade_min,
            "idade_max": idade_max,
            "period_start": period_start,
            "period_end": period_end,
        },
    }


def top_clubs_by_transfers(
    direction: str = "destino",
    posicao: str = "",
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
    limit: int = 15,
) -> List[Dict[str, Any]]:
    """
    Ranking de clubes por volume de transferências.
    direction='destino' = clubes que mais compraram.
    direction='origem'  = clubes de onde mais saíram jogadores.
    direction='formador' = clubes formadores mais produtivos.
    """
    limit = _clamp_int(limit, default=15, min_v=1, max_v=50)

    direction = str(direction or "destino").strip().lower()
    club_field_map = {
        "destino": ('t."clubeDestino"', 't."paisClubeDestino"'),
        "origem": ('t."clubeOrigem"', None),
        "formador": ('t."clubeFormador"', 't."paisClubeFormador"'),
    }

    if direction not in club_field_map:
        direction = "destino"

    club_expr, pais_expr = club_field_map[direction]

    clauses: List[str] = [f"{club_expr} IS NOT NULL", f"{club_expr} != ''"]
    params: Dict[str, Any] = {"limit": limit}

    posicao = str(posicao or "").strip()
    if posicao:
        clauses.append('t."atletaPosicao" ILIKE %(posicao)s')
        params["posicao"] = f"%{posicao}%"

    if period_start:
        clauses.append('t."dataTransferencia" >= %(period_start)s')
        params["period_start"] = period_start

    if period_end:
        clauses.append('t."dataTransferencia" <= %(period_end)s')
        params["period_end"] = period_end

    where = " WHERE " + " AND ".join(clauses)

    pais_select = f", {pais_expr} AS pais" if pais_expr else ""
    pais_group = f", {pais_expr}" if pais_expr else ""

    sql = f"""
        SELECT
            {club_expr}  AS clube,
            COUNT(*)     AS total_transferencias,
            ROUND(AVG(CASE WHEN t."valor" IS NOT NULL AND t."valor" > 0
                      THEN t."valor" END)::numeric, 2) AS avg_valor
            {pais_select}
        FROM {TRANSFER_TABLE} t
        {where}
        GROUP BY {club_expr}{pais_group}
        ORDER BY total_transferencias DESC NULLS LAST
        LIMIT %(limit)s
    """

    rows = _run_query(sql, params)

    out = []
    for r in rows:
        entry: Dict[str, Any] = {
            "clube": r[0],
            "total_transferencias": r[1],
            "avg_valor": float(r[2]) if r[2] is not None else None,
        }
        if pais_expr:
            entry["pais"] = r[3]
        out.append(entry)

    return out


def transfer_trends(
    group_by: str = "posicao",
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
    posicao: str = "",
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Agrupamento de transferências por campo (posicao, destino_pais, moeda, etc.)
    para análise de tendências de mercado.
    """
    limit = _clamp_int(limit, default=20, min_v=1, max_v=100)

    group_by = str(group_by or "posicao").strip().lower()
    if group_by not in GROUPABLE_FIELDS:
        group_by = "posicao"

    group_expr = FIELD_MAP.get(group_by, f't."{group_by}"')

    clauses: List[str] = [f"{group_expr} IS NOT NULL"]
    params: Dict[str, Any] = {"limit": limit}

    posicao = str(posicao or "").strip()
    if posicao and group_by != "posicao":
        clauses.append('t."atletaPosicao" ILIKE %(posicao)s')
        params["posicao"] = f"%{posicao}%"

    if period_start:
        clauses.append('t."dataTransferencia" >= %(period_start)s')
        params["period_start"] = period_start

    if period_end:
        clauses.append('t."dataTransferencia" <= %(period_end)s')
        params["period_end"] = period_end

    where = " WHERE " + " AND ".join(clauses)

    sql = f"""
        SELECT
            {group_expr}                                                  AS grupo,
            COUNT(*)                                                      AS total,
            ROUND(AVG(CASE WHEN t."valor" IS NOT NULL AND t."valor" > 0
                      THEN t."valor" END)::numeric, 2)                    AS avg_valor,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP
                  (ORDER BY CASE WHEN t."valor" IS NOT NULL AND t."valor" > 0
                            THEN t."valor" END)::numeric, 2)              AS median_valor
        FROM {TRANSFER_TABLE} t
        {where}
        GROUP BY {group_expr}
        ORDER BY total DESC NULLS LAST
        LIMIT %(limit)s
    """

    rows = _run_query(sql, params)

    return [
        {
            "grupo": r[0],
            group_by: r[0],
            "total": r[1],
            "avg_valor": float(r[2]) if r[2] is not None else None,
            "median_valor": float(r[3]) if r[3] is not None else None,
        }
        for r in rows
    ]
