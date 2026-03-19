import psycopg
from contextlib import contextmanager
from app.core.config import settings

@contextmanager
def get_conn():
    conn = psycopg.connect(settings.database_url, autocommit=True)
    try:
        yield conn
    finally:
        conn.close()