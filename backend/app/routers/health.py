from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.config import get_settings, Settings

router = APIRouter()


def get_supabase_client(settings: Settings):
    """Intenta crear cliente Supabase si está configurado"""
    if not settings.supabase_url or not settings.supabase_key:
        return None
    try:
        from supabase import create_client
        return create_client(settings.supabase_url, settings.supabase_key)
    except Exception:
        return None


@router.get("/health")
async def health_check():
    return JSONResponse(
        content={"status": "healthy"},
        headers={"Access-Control-Allow-Origin": "*"}
    )


@router.get("/health/db")
async def db_health_check(settings: Settings = Depends(get_settings)):
    """Verifica la conexión a Supabase"""
    try:
        # Verificar si Supabase está configurado
        if not settings.supabase_url or not settings.supabase_key:
            return JSONResponse(
                content={
                    "status": "not_configured",
                    "database": "not_configured",
                    "message": "Supabase no está configurado"
                },
                headers={"Access-Control-Allow-Origin": "*"}
            )

        # Intentar crear cliente y consulta
        client = get_supabase_client(settings)
        if client is None:
            return JSONResponse(
                content={
                    "status": "unhealthy",
                    "database": "error",
                    "message": "No se pudo crear cliente Supabase"
                },
                headers={"Access-Control-Allow-Origin": "*"}
            )

        # Intenta una consulta simple
        result = client.table("clientes").select("id").limit(1).execute()
        return JSONResponse(
            content={
                "status": "healthy",
                "database": "connected",
                "message": "Conexión a Supabase exitosa"
            },
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        return JSONResponse(
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            },
            headers={"Access-Control-Allow-Origin": "*"}
        )
