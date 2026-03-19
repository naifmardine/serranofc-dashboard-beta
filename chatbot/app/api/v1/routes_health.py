from fastapi import APIRouter, Depends
from app.api.deps import require_internal_key
from app.db.conn import get_conn

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/health/db", dependencies=[Depends(require_internal_key)])
def health_db():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
            result = cur.fetchone()[0]

    return {"db": "ok", "value": result}