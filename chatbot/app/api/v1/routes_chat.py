from fastapi import APIRouter, Depends, HTTPException
import time
import traceback

from app.api.deps import require_internal_key
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.orchestrator import handle_chat_orchestrated

router = APIRouter()


@router.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(require_internal_key)],
)
def chat(req: ChatRequest):
    t0 = time.time()
    try:
        payload = handle_chat_orchestrated(req.messages)

        return ChatResponse(
            conversation_id=req.conversation_id,
            assistant_message=str(payload.get("analysis", "") or ""),
            citations=payload.get("citations", []) or [],
            direction=str(payload.get("direction", "") or ""),
        )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal error in /v1/chat")
    finally:
        print(f"chat_ms={int((time.time() - t0) * 1000)}")