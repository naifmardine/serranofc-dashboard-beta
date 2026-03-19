# app/domain/contracts/tools.py
from pydantic import BaseModel, Field
from typing import Any, Literal

class Citation(BaseModel):
    source: Literal["neon"]
    table: str
    query_id: str
    # opcional: hash do SQL ou nome do arquivo .sql
    sql_ref: str | None = None
    # opcional: quais colunas sustentam a resposta
    fields: list[str] = Field(default_factory=list)

class ToolResult(BaseModel):
    tool: str
    ok: bool = True
    data: Any
    summary: str = ""
    citations: list[Citation] = Field(default_factory=list)
    # trace mínimo p/ debugging (sem vazar segredo)
    trace: dict[str, Any] = Field(default_factory=dict)