from __future__ import annotations

from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central config for the Serrano FC chatbot backend.

    Notes:
    - Keeps env_file default pointing to ../.env.local (your current setup)
    - Adds RAG settings + OpenAI model selection + safety limits for DB reads
    """

    model_config = SettingsConfigDict(
        env_file="../.env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_env: str = Field(default="dev", alias="APP_ENV")
    app_port: int = Field(default=8001, alias="APP_PORT")

    # Database / auth
    database_url: str = Field(..., alias="DATABASE_URL")
    internal_api_key: str = Field(..., alias="INTERNAL_API_KEY")

    # OpenAI
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o", alias="OPENAI_MODEL")
    openai_max_output_tokens: int = Field(default=16000, alias="OPENAI_MAX_OUTPUT_TOKENS")

    # RAG (local files)
    rag_root: str = Field(default="data/rag", alias="RAG_ROOT")
    rag_enable_hot_reload: bool = Field(default=True, alias="RAG_ENABLE_HOT_RELOAD")

    # Safety / execution limits (used by tools/executor)
    statement_timeout_ms: int = Field(default=2000, alias="DB_STATEMENT_TIMEOUT_MS")
    max_rows_hard: int = Field(default=2000, alias="DB_MAX_ROWS_HARD")
    default_limit_rankings: int = Field(default=10, alias="DEFAULT_LIMIT_RANKINGS")
    default_limit_lists: int = Field(default=25, alias="DEFAULT_LIMIT_LISTS")

    # Privacy
    # If True, tools must never return sensitive fields (e.g., cpf).
    strict_privacy: bool = Field(default=True, alias="STRICT_PRIVACY")

    def rag_root_path(self) -> Path:
        return Path(self.rag_root)


settings = Settings()