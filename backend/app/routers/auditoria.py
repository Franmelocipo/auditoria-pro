from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Body, Request
from fastapi.responses import JSONResponse
from typing import Optional, Any
import math

from app.config import get_settings, Settings
from app.schemas.auditoria import (
    ConciliacionCreate,
    ConciliacionResponse,
    ConciliacionListResponse,
    FusionRequest
)
from app.services.procesamiento import (
    procesar_excel,
    agrupar_por_razon_social,
    fusionar_agrupaciones
)

router = APIRouter()

# Cache del cliente Supabase para evitar recrear en cada request
_supabase_client = None


def _create_supabase_client(url: str, key: str):
    """Crea cliente Supabase con timeout extendido"""
    global _supabase_client
    if _supabase_client is None:
        try:
            from supabase import create_client, ClientOptions
            # Supabase 2.x con timeout extendido
            options = ClientOptions(
                postgrest_client_timeout=120,
                storage_client_timeout=120,
            )
            _supabase_client = create_client(url, key, options=options)
        except (ImportError, TypeError):
            # Fallback para versiones anteriores sin ClientOptions
            from supabase import create_client
            _supabase_client = create_client(url, key)
    return _supabase_client


def get_supabase_client(settings: Settings = Depends(get_settings)):
    """Retorna cliente Supabase o None si no está configurado"""
    if not settings.supabase_url or not settings.supabase_key:
        return None
    try:
        return _create_supabase_client(settings.supabase_url, settings.supabase_key)
    except Exception as e:
        print(f"Error creando cliente Supabase: {e}")
        return None


def require_supabase(settings: Settings = Depends(get_settings)):
    """Dependencia que requiere Supabase configurado"""
    if not settings.supabase_url or not settings.supabase_key:
        raise HTTPException(
            status_code=503,
            detail="Base de datos no configurada. Configure SUPABASE_URL y SUPABASE_KEY."
        )
    try:
        return _create_supabase_client(settings.supabase_url, settings.supabase_key)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Error conectando a Supabase: {str(e)}"
        )


@router.get("/conciliaciones", response_model=ConciliacionListResponse)
async def listar_conciliaciones(
    cliente_id: Optional[str] = Query(None, description="Filtrar por cliente"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    supabase = Depends(require_supabase)
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
    supabase = Depends(require_supabase)
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

        # Reconstruir registros dentro de agrupaciones si están vacíos
        registros = conciliacion.get("registros", [])
        agrupaciones = conciliacion.get("agrupaciones", [])

        if registros and agrupaciones:
            # Crear mapa de registros por ID para acceso rápido
            registros_por_id = {r.get("id"): r for r in registros if r.get("id")}

            # Verificar si alguna agrupación tiene registros vacíos pero cantidad > 0
            necesita_reconstruir = any(
                a.get("cantidad", 0) > 0 and not a.get("registros")
                for a in agrupaciones
            )

            if necesita_reconstruir:
                # Crear mapa de razón social normalizada a registros
                from app.services.agrupacion import generar_clave_agrupacion

                registros_por_grupo: dict[str, list] = {}
                for r in registros:
                    razon_social = r.get("razon_social", "Sin Asignar")
                    clave = generar_clave_agrupacion(razon_social)
                    if clave not in registros_por_grupo:
                        registros_por_grupo[clave] = []
                    registros_por_grupo[clave].append(r)

                # Reconstruir registros en cada agrupación
                for agrupacion in agrupaciones:
                    if agrupacion.get("cantidad", 0) > 0 and not agrupacion.get("registros"):
                        razon_social = agrupacion.get("razonSocial", "")
                        clave = generar_clave_agrupacion(razon_social)

                        # Buscar registros que coincidan
                        if clave in registros_por_grupo:
                            agrupacion["registros"] = registros_por_grupo[clave]
                        else:
                            # Intentar buscar por variantes
                            variantes = agrupacion.get("variantes", [razon_social])
                            registros_encontrados = []
                            for variante in variantes:
                                clave_var = generar_clave_agrupacion(variante)
                                if clave_var in registros_por_grupo:
                                    registros_encontrados.extend(registros_por_grupo[clave_var])
                            if registros_encontrados:
                                agrupacion["registros"] = registros_encontrados

                conciliacion["agrupaciones"] = agrupaciones
                conciliacion["_registros_reconstruidos"] = True

        # Mapear saldos a camelCase para el frontend
        if conciliacion.get("saldos_inicio"):
            conciliacion["saldosInicio"] = conciliacion.pop("saldos_inicio")
        if conciliacion.get("saldos_cierre"):
            conciliacion["saldosCierre"] = conciliacion.pop("saldos_cierre")

        return conciliacion

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener conciliación: {str(e)}")


def limpiar_valores_json(obj):
    """Limpia valores que no son válidos en JSON (NaN, Infinity)"""
    if isinstance(obj, dict):
        return {k: limpiar_valores_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [limpiar_valores_json(item) for item in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0
        return obj
    return obj


@router.post("/conciliaciones")
async def crear_conciliacion(
    request: Request,
    supabase = Depends(require_supabase)
):
    """Crea o actualiza una conciliación de mayores"""
    try:
        # Leer body raw para evitar problemas con Pydantic y valores NaN
        body = await request.json()

        nombre = body.get("nombre")
        if not nombre:
            raise HTTPException(status_code=400, detail="El nombre es requerido")

        cliente_id = body.get("cliente_id")
        registros = body.get("registros", [])
        agrupaciones = body.get("agrupaciones", [])
        saldos_inicio = body.get("saldosInicio", [])
        saldos_cierre = body.get("saldosCierre", [])
        conciliacion_id_existente = body.get("id")

        # Limpiar valores NaN/Infinity
        registros = limpiar_valores_json(registros)
        agrupaciones = limpiar_valores_json(agrupaciones)
        saldos_inicio = limpiar_valores_json(saldos_inicio)
        saldos_cierre = limpiar_valores_json(saldos_cierre)

        # Determinar si guardar en tablas auxiliares
        guardar_registros_separado = len(registros) > 10000
        guardar_agrupaciones_separado = len(agrupaciones) > 1000

        # Datos principales (sin saldos primero para compatibilidad)
        data_principal = {
            "nombre": nombre,
            "cliente_id": cliente_id,
            "registros_count": len(registros),
            "agrupaciones_count": len(agrupaciones),
            "registros_guardados_separado": guardar_registros_separado,
            "agrupaciones_guardadas_separado": guardar_agrupaciones_separado,
        }

        if not guardar_registros_separado:
            data_principal["registros"] = registros

        if not guardar_agrupaciones_separado:
            data_principal["agrupaciones"] = agrupaciones

        # Intentar agregar saldos (puede fallar si columnas no existen)
        saldos_guardados = False
        try:
            data_con_saldos = {
                **data_principal,
                "saldos_inicio": saldos_inicio,
                "saldos_cierre": saldos_cierre,
            }

            if conciliacion_id_existente:
                result = supabase.table("conciliaciones_mayor").update(
                    data_con_saldos
                ).eq("id", conciliacion_id_existente).execute()
                conciliacion_id = conciliacion_id_existente
            else:
                result = supabase.table("conciliaciones_mayor").insert(
                    data_con_saldos
                ).execute()
                conciliacion_id = result.data[0]["id"]

            saldos_guardados = True

        except Exception as e:
            error_msg = str(e).lower()
            # Si el error es por columnas que no existen, guardar sin saldos
            if "column" in error_msg or "saldos" in error_msg or "undefined" in error_msg:
                print(f"Advertencia: No se pudieron guardar saldos, guardando sin ellos: {e}")
                if conciliacion_id_existente:
                    result = supabase.table("conciliaciones_mayor").update(
                        data_principal
                    ).eq("id", conciliacion_id_existente).execute()
                    conciliacion_id = conciliacion_id_existente
                else:
                    result = supabase.table("conciliaciones_mayor").insert(
                        data_principal
                    ).execute()
                    conciliacion_id = result.data[0]["id"]
            else:
                raise e

        # Guardar registros en tabla auxiliar si es necesario
        if guardar_registros_separado:
            supabase.table("registros_mayor_detalle").upsert({
                "conciliacion_id": conciliacion_id,
                "registros": registros
            }).execute()

        # Guardar agrupaciones en tabla auxiliar si es necesario
        if guardar_agrupaciones_separado:
            supabase.table("agrupaciones_mayor_detalle").upsert({
                "conciliacion_id": conciliacion_id,
                "agrupaciones": agrupaciones
            }).execute()

        response = {
            "success": True,
            "id": conciliacion_id,
            "message": "Conciliacion guardada correctamente",
            "registros_count": len(registros),
            "agrupaciones_count": len(agrupaciones)
        }

        if not saldos_guardados and (saldos_inicio or saldos_cierre):
            response["warning"] = "Los saldos no se guardaron. Ejecute en Supabase: ALTER TABLE conciliaciones_mayor ADD COLUMN saldos_inicio JSONB DEFAULT '[]', ADD COLUMN saldos_cierre JSONB DEFAULT '[]';"

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar conciliacion: {str(e)}")


@router.post("/procesar-excel")
async def procesar_archivo_excel(
    archivo: UploadFile = File(...),
    agrupar: bool = Query(True, description="Agrupar automaticamente por razon social")
):
    """
    Procesa un archivo Excel con mayores contables.
    Opcionalmente agrupa por razon social automaticamente.
    """
    try:
        if not archivo.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")

        # Leer archivo en memoria
        contenido = await archivo.read()

        # Procesar Excel
        resultado = procesar_excel(contenido, archivo.filename)

        if agrupar and resultado['registros']:
            # Agrupar por razon social
            agrupacion_result = agrupar_por_razon_social(resultado['registros'])

            return {
                "success": True,
                "registros": resultado['registros'],
                "agrupaciones": agrupacion_result['agrupaciones'],
                "sin_asignar": agrupacion_result['sin_asignar'],
                "totales": agrupacion_result['totales'],
                "estadisticas": agrupacion_result['estadisticas'],
                "columnas": resultado['columnas']
            }

        return {
            "success": True,
            "registros": resultado['registros'],
            "total": resultado['total'],
            "columnas": resultado['columnas']
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar Excel: {str(e)}")


@router.post("/agrupar")
async def agrupar_registros(
    registros: list[dict] = Body(..., description="Lista de registros a agrupar"),
    umbral_similitud: float = Query(0.75, ge=0, le=1, description="Umbral de similitud para agrupar")
):
    """
    Agrupa registros por razon social.
    Util cuando ya tienes los registros y quieres reagrupar.
    """
    try:
        resultado = agrupar_por_razon_social(registros, umbral_similitud)
        return {
            "success": True,
            **resultado
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al agrupar: {str(e)}")


@router.post("/fusionar")
async def fusionar_grupos(fusion: FusionRequest):
    """
    Fusiona dos agrupaciones en una sola.
    La agrupacion destino absorbe a la origen.
    """
    try:
        resultado = fusionar_agrupaciones(
            fusion.agrupacion_destino,
            fusion.agrupacion_origen
        )
        return {
            "success": True,
            "agrupacion": resultado
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al fusionar: {str(e)}")


@router.post("/procesar-saldos")
async def procesar_archivo_saldos(
    file: UploadFile = File(...),
):
    """
    Procesa un archivo Excel con saldos por razón social.
    Espera columnas: Razón Social / Nombre y Saldo / Monto / Importe
    """
    import pandas as pd
    from io import BytesIO

    try:
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="El archivo debe ser Excel o CSV")

        contenido = await file.read()

        # Leer archivo
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(contenido))
        else:
            df = pd.read_excel(BytesIO(contenido))

        # Normalizar nombres de columnas
        df.columns = df.columns.str.strip().str.lower()

        # Buscar columna de razón social
        col_razon = None
        for col in df.columns:
            if any(x in col for x in ['razon', 'razón', 'nombre', 'cliente', 'proveedor', 'deudor']):
                col_razon = col
                break

        if not col_razon:
            # Usar primera columna de texto
            for col in df.columns:
                if df[col].dtype == 'object':
                    col_razon = col
                    break

        if not col_razon:
            raise HTTPException(status_code=400, detail="No se encontró columna de razón social")

        # Buscar columna de saldo
        col_saldo = None
        for col in df.columns:
            if any(x in col for x in ['saldo', 'monto', 'importe', 'total', 'debe', 'haber']):
                col_saldo = col
                break

        if not col_saldo:
            # Buscar primera columna numérica
            for col in df.columns:
                if col != col_razon and pd.api.types.is_numeric_dtype(df[col]):
                    col_saldo = col
                    break

        if not col_saldo:
            raise HTTPException(status_code=400, detail="No se encontró columna de saldo")

        # Procesar datos
        saldos = []
        for _, row in df.iterrows():
            razon = str(row[col_razon]).strip() if pd.notna(row[col_razon]) else ''
            if not razon or razon.lower() in ['nan', 'none', '']:
                continue

            try:
                saldo_val = row[col_saldo]
                if pd.isna(saldo_val):
                    saldo = 0.0
                elif isinstance(saldo_val, str):
                    # Limpiar formato de moneda
                    saldo_str = saldo_val.replace('$', '').replace('.', '').replace(',', '.').strip()
                    saldo = float(saldo_str) if saldo_str else 0.0
                else:
                    saldo = float(saldo_val)
            except (ValueError, TypeError):
                saldo = 0.0

            saldos.append({
                "razonSocial": razon,
                "saldo": saldo
            })

        return {
            "success": True,
            "saldos": saldos,
            "total": len(saldos),
            "columna_razon": col_razon,
            "columna_saldo": col_saldo
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar saldos: {str(e)}")


@router.delete("/conciliaciones/{conciliacion_id}")
async def eliminar_conciliacion(
    conciliacion_id: int,
    supabase = Depends(require_supabase)
):
    """Elimina una conciliacion y sus datos relacionados"""
    try:
        # Eliminar de tablas auxiliares primero
        supabase.table("registros_mayor_detalle").delete().eq(
            "conciliacion_id", conciliacion_id
        ).execute()

        supabase.table("agrupaciones_mayor_detalle").delete().eq(
            "conciliacion_id", conciliacion_id
        ).execute()

        # Eliminar conciliacion principal
        supabase.table("conciliaciones_mayor").delete().eq(
            "id", conciliacion_id
        ).execute()

        return {"success": True, "message": "Conciliacion eliminada"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")


@router.get("/clientes")
async def listar_clientes(
    supabase = Depends(require_supabase)
):
    """Lista todos los clientes disponibles"""
    try:
        result = supabase.table("clientes").select("id, razon_social, cuit").order("razon_social").execute()
        # Mapear razon_social a nombre para compatibilidad con frontend
        clientes = [
            {"id": c["id"], "nombre": c["razon_social"], "cuit": c.get("cuit")}
            for c in result.data
        ]
        return {
            "success": True,
            "clientes": clientes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar clientes: {str(e)}")
