# app/domain/tools/registry.py
from typing import Callable, Any
from pydantic import BaseModel
from app.contracts.tools import ToolResult

class ToolDef(BaseModel):
    name: str
    description: str
    input_schema: dict  # JSON Schema p/ OpenAI
    handler: Callable[[dict], ToolResult]

REGISTRY: dict[str, ToolDef] = {}

def register(tool: ToolDef):
    if tool.name in REGISTRY:
        raise ValueError(f"Tool already registered: {tool.name}")
    REGISTRY[tool.name] = tool

def get_tools_for_openai():
    # formato da Responses API: tools=[{"type":"function","name":...,"parameters":...}]
    return [
        {
            "type": "function",
            "name": t.name,
            "description": t.description,
            "parameters": t.input_schema,
        }
        for t in REGISTRY.values()
    ]