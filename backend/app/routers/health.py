from fastapi import APIRouter, Depends
from supabase import create_client, Client

from app.config import get_settings, Settings

router = APIRouter()


def get_supabase(settings: Settings = Depends(get_settings)) -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)


@router.get("/health")
async def health_check():
    return {"status": "healthy"}


@router.get("/health/db")
async def db_health_check(supabase: Client = Depends(get_supabase)):
    """Verifica la conexión a Supabase"""
    try:
        # Intenta una consulta simple
        result = supabase.table("clientes").select("id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "message": "Conexión a Supabase exitosa"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }
