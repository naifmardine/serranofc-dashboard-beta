# app/domain/contracts/chat.py
from pydantic import BaseModel, Field
from typing import Literal, Any

Role = Literal["system","user","assistant","tool"]

class ChatMessage(BaseModel):
    role: Role
    content: str

class ChatRequest(BaseModel):
    conversation_id: str
    messages: list[ChatMessage]
    context: dict[str, Any] = Field(default_factory=dict)

class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    direction: str
    citations: list[dict] = Field(default_factory=list)
    tool_traces: list[dict] = Field(default_factory=list)