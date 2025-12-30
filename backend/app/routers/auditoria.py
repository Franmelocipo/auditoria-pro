from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from supabase import create_client, Client
from typing import Optional
import pandas as pd
from io import BytesIO

from app.config import get_settings, Settings
from app.schemas.auditoria import (
    ConciliacionCreate,
    ConciliacionResponse,
    ConciliacionListResponse,
    RegistroMayor,
    AgrupacionMayor
)

router = APIRouter()


def get_supabase(settings: Settings = Depends(get_settings)) -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)


@router.get("/conciliaciones", response_model=ConciliacionListResponse)
async def listar_conciliaciones(
    cliente_id: Optional[int] = Query(None, description="Filtrar por cliente"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    supabase: Client = Depends(get_supabase)
):
    """Lista todas las conciliaciones de mayores guardadas"""
    try:
        query = supabase.table("conciliaciones_mayor").select(
            "id, nombre, cliente_id, fecha_creacion, fecha_modificacion, registros_count, agrupaciones_count"
        )

        if cliente_id:
            query = query.eq("cliente_id", cliente_id)

        result = query.order("fecha_modificacion", desc=True).range(offset, offset + limit - 1).execute()

        return {
            "conciliaciones": result.data,
            "total": len(result.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar conciliaciones: {str(e)}")


@router.get("/conciliaciones/{conciliacion_id}", response_model=ConciliacionResponse)
async def obtener_conciliacion(
    conciliacion_id: int,
    supabase: Client = Depends(get_supabase)
):
    """Obtiene una conciliación específica con todos sus datos"""
    try:
        # Obtener conciliación principal
        result = supabase.table("conciliaciones_mayor").select("*").eq("id", conciliacion_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Conciliación no encontrada")

        conciliacion = result.data

        # Cargar registros desde tabla auxiliar si es necesario
        if conciliacion.get("registros_guardados_separado"):
            registros_result = supabase.table("registros_mayor_detalle").select(
                "registros"
            ).eq("conciliacion_id", conciliacion_id).execute()

            if registros_result.data:
                conciliacion["registros"] = registros_result.data[0].get("registros", [])

        # Cargar agrupaciones desde tabla auxiliar si es necesario
        if conciliacion.get("agrupaciones_guardadas_separado"):
            agrupaciones_result = supabase.table("agrupaciones_mayor_detalle").select(
                "agrupaciones"
            ).eq("conciliacion_id", conciliacion_id).execute()

            if agrupaciones_result.data:
                conciliacion["agrupaciones"] = agrupaciones_result.data[0].get("agrupaciones", [])

        return conciliacion

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener conciliación: {str(e)}")


@router.post("/conciliaciones")
async def crear_conciliacion(
    conciliacion: ConciliacionCreate,
    supabase: Client = Depends(get_supabase)
):
    """Crea o actualiza una conciliación de mayores"""
    try:
        registros = conciliacion.registros or []
        agrupaciones = conciliacion.agrupaciones or []

        # Determinar si guardar en tablas auxiliares
        guardar_registros_separado = len(registros) > 10000
        guardar_agrupaciones_separado = len(agrupaciones) > 1000

        # Datos principales
        data_principal = {
            "nombre": conciliacion.nombre,
            "cliente_id": conciliacion.cliente_id,
            "registros_count": len(registros),
            "agrupaciones_count": len(agrupaciones),
            "registros_guardados_separado": guardar_registros_separado,
            "agrupaciones_guardadas_separado": guardar_agrupaciones_separado,
        }

        if not guardar_registros_separado:
            data_principal["registros"] = [r.model_dump() for r in registros]

        if not guardar_agrupaciones_separado:
            data_principal["agrupaciones"] = [a.model_dump() for a in agrupaciones]

        # Guardar o actualizar
        if conciliacion.id:
            result = supabase.table("conciliaciones_mayor").update(
                data_principal
            ).eq("id", conciliacion.id).execute()
            conciliacion_id = conciliacion.id
        else:
            result = supabase.table("conciliaciones_mayor").insert(
                data_principal
            ).execute()
            conciliacion_id = result.data[0]["id"]

        # Guardar registros en tabla auxiliar si es necesario
        if guardar_registros_separado:
            registros_data = [r.model_dump() for r in registros]
            supabase.table("registros_mayor_detalle").upsert({
                "conciliacion_id": conciliacion_id,
                "registros": registros_data
            }).execute()

        # Guardar agrupaciones en tabla auxiliar si es necesario
        if guardar_agrupaciones_separado:
            agrupaciones_data = [a.model_dump() for a in agrupaciones]
            supabase.table("agrupaciones_mayor_detalle").upsert({
                "conciliacion_id": conciliacion_id,
                "agrupaciones": agrupaciones_data
            }).execute()

        return {
            "success": True,
            "id": conciliacion_id,
            "message": "Conciliación guardada correctamente",
            "registros_count": len(registros),
            "agrupaciones_count": len(agrupaciones)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar conciliación: {str(e)}")


@router.post("/procesar-excel")
async def procesar_excel(
    archivo: UploadFile = File(...),
    supabase: Client = Depends(get_supabase)
):
    """
    Procesa un archivo Excel con mayores contables.
    Retorna los registros parseados listos para agrupar.
    """
    try:
        if not archivo.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")

        # Leer archivo en memoria
        contenido = await archivo.read()

        # Procesar con Pandas
        df = pd.read_excel(BytesIO(contenido))

        # Normalizar columnas (minúsculas, sin espacios)
        df.columns = df.columns.str.strip().str.lower()

        # Mapeo de columnas comunes
        columnas_mapping = {
            'fecha': ['fecha', 'date', 'fec'],
            'concepto': ['concepto', 'descripcion', 'detalle', 'description'],
            'debe': ['debe', 'debit', 'debito'],
            'haber': ['haber', 'credit', 'credito'],
            'saldo': ['saldo', 'balance'],
        }

        # Detectar y renombrar columnas
        columnas_finales = {}
        for col_standard, opciones in columnas_mapping.items():
            for opcion in opciones:
                if opcion in df.columns:
                    columnas_finales[opcion] = col_standard
                    break

        df = df.rename(columns=columnas_finales)

        # Convertir a lista de registros
        registros = df.fillna('').to_dict('records')

        return {
            "success": True,
            "registros": registros,
            "total": len(registros),
            "columnas_detectadas": list(df.columns)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar Excel: {str(e)}")


@router.delete("/conciliaciones/{conciliacion_id}")
async def eliminar_conciliacion(
    conciliacion_id: int,
    supabase: Client = Depends(get_supabase)
):
    """Elimina una conciliación y sus datos relacionados"""
    try:
        # Eliminar de tablas auxiliares primero
        supabase.table("registros_mayor_detalle").delete().eq(
            "conciliacion_id", conciliacion_id
        ).execute()

        supabase.table("agrupaciones_mayor_detalle").delete().eq(
            "conciliacion_id", conciliacion_id
        ).execute()

        # Eliminar conciliación principal
        supabase.table("conciliaciones_mayor").delete().eq(
            "id", conciliacion_id
        ).execute()

        return {"success": True, "message": "Conciliación eliminada"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")
