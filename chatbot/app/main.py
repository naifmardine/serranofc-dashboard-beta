from fastapi import FastAPI
from app.api.v1.routes_health import router as health_router
from app.api.v1.routes_chat import router as chat_router

app = FastAPI(title="Serrano Chatbot API", version="0.1.0")

app.include_router(health_router, prefix="/v1")
app.include_router(chat_router, prefix="/v1")