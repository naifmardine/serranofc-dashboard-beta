from __future__ import annotations

from typing import Any, Dict, List, Optional

from openai import OpenAI

from app.core.config import settings


_client: Optional[OpenAI] = None


def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def create_response(
    *,
    instructions: str,
    input_items: List[Dict[str, Any]],
    tools: List[Dict[str, Any]],
    model: Optional[str] = None,
    previous_response_id: Optional[str] = None,
    tool_choice: str = "auto",
    max_output_tokens: Optional[int] = None,
) -> Any:
    client = get_openai_client()

    payload: Dict[str, Any] = {
        "model": model or getattr(settings, "openai_model", None) or "gpt-4o",
        "instructions": instructions,
        "input": input_items,
        "max_output_tokens": max_output_tokens or getattr(settings, "openai_max_output_tokens", 4096),
    }

    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = tool_choice

    if previous_response_id:
        payload["previous_response_id"] = previous_response_id

    return client.responses.create(**payload)