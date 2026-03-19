from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.schemas.chat import ChatMessage
from app.services.llm_client import create_response
from app.services.tools_registry import run_tool, tools_for_responses_api

INSTRUCTIONS_FILE = Path("app/services/chatbot_instructions.txt")
MAX_TOOL_ROUNDS = 3   # 99% das queries precisam de 1-2 tool calls; 3 é suficiente
MAX_HISTORY_MESSAGES = 14
# Tokens para rodadas intermediárias (só precisam de JSON de function call, ~100-200 tokens)
_TOOL_ROUND_MAX_TOKENS = 4096


def handle_chat_orchestrated(messages: List[ChatMessage]) -> Dict[str, Any]:
    t0 = time.time()

    if not messages:
        return _payload(
            analysis="Nenhuma mensagem recebida.",
            direction="Envie uma pergunta sobre jogadores, clubes, elenco, mercado ou transferências.",
            latency_ms=_latency_ms(t0),
        )

    instructions = _load_instructions()
    tools = tools_for_responses_api()
    history = _build_input_history(messages)

    tool_traces: List[Dict[str, Any]] = []

    # Primeira chamada: força tool call para evitar resposta de memória.
    # Usa poucos tokens pois só precisa do JSON da function call.
    first_tool_choice = "required" if tools else "auto"
    response = create_response(
        instructions=instructions,
        input_items=history,
        tools=tools,
        tool_choice=first_tool_choice,
        max_output_tokens=_TOOL_ROUND_MAX_TOKENS,
    )

    round_count = 0

    while round_count < MAX_TOOL_ROUNDS:
        round_count += 1

        tool_calls = _extract_tool_calls(response)
        if not tool_calls:
            # Modelo terminou de usar ferramentas — response já contém o texto final.
            break

        # Executa todas as tool calls do round em paralelo (cada call abre sua própria conexão DB)
        with ThreadPoolExecutor(max_workers=min(len(tool_calls), 8)) as executor:
            pairs = list(executor.map(
                lambda c: (c, run_tool(c["name"], c["arguments"])),
                tool_calls,
            ))

        outputs = []
        for call, result in pairs:
            tool_traces.append(
                {
                    "tool": call["name"],
                    "call_id": call["call_id"],
                    "args": call["arguments"],
                    "summary": result.get("summary"),
                    "error": result.get("error"),
                }
            )

            outputs.append(
                {
                    "type": "function_call_output",
                    "call_id": call["call_id"],
                    "output": json.dumps(result, ensure_ascii=False),
                }
            )

        is_final_round = (round_count >= MAX_TOOL_ROUNDS)

        response = create_response(
            instructions=instructions,
            input_items=outputs,
            # Na última rodada: sem ferramentas (força resposta textual).
            # Em rodadas intermediárias: ferramentas disponíveis.
            # Tokens completos em TODAS as rodadas — o modelo pode decidir responder
            # diretamente na rodada 1 ou 2, e precisa de orçamento suficiente.
            tools=[] if is_final_round else tools,
            previous_response_id=response.id,
            max_output_tokens=settings.openai_max_output_tokens,
        )

        if is_final_round:
            break

    # Sem chamada de grounding separada — o PROTOCOLO ANTI-INVENÇÃO no sistema prompt
    # e a instrução de formato detalhado já garantem qualidade e grounding.

    final_text = _extract_output_text(response).strip()
    if not final_text:
        # if the model failed to produce text, try to fall back to the last tool result summary
        if tool_traces:
            last = tool_traces[-1]
            summary = last.get("summary") or "sem resultado útil"
            final_text = f"{summary}"
        else:
            final_text = "Consegui processar a pergunta, mas não consegui montar uma resposta final útil."

    return _payload(
        analysis=final_text,
        direction="Posso aprofundar com outro recorte, comparação ou período.",
        citations=[],
        tool_traces=tool_traces,
        latency_ms=_latency_ms(t0),
    )


def _load_instructions() -> str:
    if INSTRUCTIONS_FILE.exists():
        return INSTRUCTIONS_FILE.read_text(encoding="utf-8")
    return "Você é um analista conversacional de dados do Serrano."


def _build_input_history(messages: List[ChatMessage]) -> List[Dict[str, Any]]:
    trimmed = messages[-MAX_HISTORY_MESSAGES:]
    items: List[Dict[str, Any]] = []

    for msg in trimmed:
        role = getattr(msg, "role", "user")
        content = (getattr(msg, "content", "") or "").strip()
        if not content:
            continue

        # formato simples e robusto
        items.append(
            {
                "role": role,
                "content": content,
            }
        )

    return items


def _extract_tool_calls(response: Any) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []

    for item in getattr(response, "output", []) or []:
        if getattr(item, "type", None) == "function_call":
            try:
                arguments = json.loads(item.arguments or "{}")
            except Exception:
                arguments = {}

            out.append(
                {
                    "call_id": item.call_id,
                    "name": item.name,
                    "arguments": arguments,
                }
            )

    return out


def _extract_output_text(response: Any) -> str:
    sdk_text = getattr(response, "output_text", None)
    if sdk_text:
        return sdk_text

    texts: List[str] = []
    for item in getattr(response, "output", []) or []:
        if getattr(item, "type", None) == "message":
            for c in getattr(item, "content", []) or []:
                c_type = getattr(c, "type", None)
                if c_type in {"output_text", "text"}:
                    txt = getattr(c, "text", "") or ""
                    if txt:
                        texts.append(txt)

    return "\n".join(texts)


def _payload(
    analysis: str,
    direction: str = "",
    citations: Optional[List[Any]] = None,
    tool_traces: Optional[List[Dict[str, Any]]] = None,
    latency_ms: Optional[int] = None,
) -> Dict[str, Any]:
    out = {
        "analysis": str(analysis or "").strip(),
        "citations": citations or [],
        "direction": str(direction or "").strip(),
        "tool_traces": tool_traces or [],
    }
    if latency_ms is not None:
        out["latency_ms"] = latency_ms
    return out


def _latency_ms(t0: float) -> int:
    return int((time.time() - t0) * 1000)