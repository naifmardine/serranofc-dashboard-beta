from pydantic import BaseModel, Field
from typing import List, Literal, Dict, Any

Role = Literal["system", "user", "assistant"]

class ChatMessage(BaseModel):
    role: Role
    content: str

class ChatRequest(BaseModel):
    conversation_id: str = Field(min_length=6)
    messages: List[ChatMessage]
    context: Dict[str, Any] = Field(default_factory=dict)

class Citation(BaseModel):
    type: str
    id: str

class ChatResponse(BaseModel):
    conversation_id: str
    assistant_message: str
    citations: List[Citation] = Field(default_factory=list)
    direction: str = ""  # sempre obrigatório no final