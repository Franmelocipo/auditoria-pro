from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.config import get_settings, Settings

router = APIRouter()


def get_supabase_client(settings: Settings):
    """Intenta crear cliente Supabase si está configurado"""
    if not settings.supabase_url or not settings.supabase_key:
        return None, "Variables no configuradas"
    try:
        from supabase import create_client
        # Debug
        print(f"DEBUG - URL starts with: {settings.supabase_url[:40]}...")
        print(f"DEBUG - KEY length: {len(settings.supabase_key)}")
        client = create_client(settings.supabase_url, settings.supabase_key)
        return client, None
    except Exception as e:
        print(f"DEBUG - Error creating client: {str(e)}")
        return None, str(e)


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
        # Debug: mostrar si las variables están configuradas
        print(f"DEBUG - SUPABASE_URL exists: {bool(settings.supabase_url)}")
        print(f"DEBUG - SUPABASE_KEY exists: {bool(settings.supabase_key)}")

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
        client, error = get_supabase_client(settings)
        if client is None:
            return JSONResponse(
                content={
                    "status": "unhealthy",
                    "database": "error",
                    "message": f"No se pudo crear cliente Supabase: {error}"
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
