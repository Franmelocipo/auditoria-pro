"""
Servicio de procesamiento de archivos Excel y agrupación de registros.
Optimizado para grandes volúmenes de datos usando Pandas.
"""
import pandas as pd
from io import BytesIO
from typing import Any
from datetime import datetime

from app.services.agrupacion import (
    extraer_razon_social,
    generar_clave_agrupacion,
    calcular_similitud,
    generar_id_agrupacion
)


def procesar_excel(contenido: bytes, nombre_archivo: str) -> dict[str, Any]:
    """
    Procesa un archivo Excel y retorna los registros parseados.

    Args:
        contenido: Bytes del archivo Excel
        nombre_archivo: Nombre del archivo para detectar formato

    Returns:
        Dict con registros y metadata
    """
    # Detectar formato
    if nombre_archivo.endswith('.xlsx'):
        df = pd.read_excel(BytesIO(contenido), engine='openpyxl')
    elif nombre_archivo.endswith('.xls'):
        df = pd.read_excel(BytesIO(contenido), engine='xlrd')
    else:
        df = pd.read_excel(BytesIO(contenido))

    # Normalizar nombres de columnas
    df.columns = df.columns.str.strip().str.lower()

    # Mapeo de columnas comunes
    mapeo_columnas = {
        'fecha': ['fecha', 'date', 'fec', 'fcha'],
        'descripcion': ['descripcion', 'concepto', 'detalle', 'description', 'desc', 'leyenda'],
        'debe': ['debe', 'debit', 'debito', 'débito'],
        'haber': ['haber', 'credit', 'credito', 'crédito'],
        'saldo': ['saldo', 'balance'],
        'cuenta': ['cuenta', 'account', 'cta'],
        'comprobante': ['comprobante', 'comprob', 'comp', 'nro', 'numero'],
        'asiento': ['asiento', 'entry', 'nro_asiento', 'asient']
    }

    columnas_finales = {}
    for col_standard, opciones in mapeo_columnas.items():
        for opcion in opciones:
            if opcion in df.columns:
                columnas_finales[opcion] = col_standard
                break

    df = df.rename(columns=columnas_finales)

    # Asegurar columnas numéricas
    for col in ['debe', 'haber', 'saldo']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # Generar IDs únicos para cada registro
    df['id'] = [f"reg_{i}_{int(datetime.now().timestamp() * 1000)}" for i in range(len(df))]

    # Convertir fechas a string ISO
    if 'fecha' in df.columns:
        df['fecha'] = pd.to_datetime(df['fecha'], errors='coerce')
        df['fecha'] = df['fecha'].apply(
            lambda x: x.isoformat() if pd.notna(x) else None
        )

    # Convertir NaN a None para JSON
    df = df.where(pd.notna(df), None)

    registros = df.to_dict('records')

    return {
        'registros': registros,
        'total': len(registros),
        'columnas': list(df.columns),
        'columnas_mapeadas': list(columnas_finales.values())
    }


def agrupar_por_razon_social(
    registros: list[dict],
    umbral_similitud: float = 0.75
) -> dict[str, Any]:
    """
    Agrupa registros por razón social extraída de la descripción.
    Usa procesamiento vectorizado con Pandas para mejor rendimiento.

    Args:
        registros: Lista de registros del mayor
        umbral_similitud: Umbral para considerar razones sociales similares (0-1)

    Returns:
        Dict con agrupaciones y estadísticas
    """
    if not registros:
        return {
            'agrupaciones': [],
            'sin_asignar': [],
            'totales': {'debe': 0, 'haber': 0, 'saldo': 0}
        }

    # Convertir a DataFrame para procesamiento eficiente
    df = pd.DataFrame(registros)

    # Extraer razón social de cada registro
    descripcion_col = 'descripcion' if 'descripcion' in df.columns else None
    if not descripcion_col:
        # Buscar columna alternativa
        for col in ['concepto', 'detalle', 'leyenda']:
            if col in df.columns:
                descripcion_col = col
                break

    if descripcion_col:
        df['razon_social'] = df[descripcion_col].apply(
            lambda x: extraer_razon_social(str(x) if pd.notna(x) else '')
        )
    else:
        df['razon_social'] = 'Sin Asignar'

    # Generar claves de agrupación
    df['clave_agrupacion'] = df['razon_social'].apply(generar_clave_agrupacion)

    # Separar sin asignar
    sin_asignar_mask = df['razon_social'] == 'Sin Asignar'
    df_sin_asignar = df[sin_asignar_mask]
    df_asignados = df[~sin_asignar_mask]

    # Agrupar por clave, considerando similitud
    clave_a_canonica: dict[str, str] = {}
    registros_por_grupo: dict[str, list] = {}

    for _, row in df_asignados.iterrows():
        clave = row['clave_agrupacion']
        razon_social = row['razon_social']
        registro = row.to_dict()

        # Buscar si ya existe una clave similar
        razon_canonica = razon_social
        encontrada = False

        if clave in clave_a_canonica:
            razon_canonica = clave_a_canonica[clave]
            encontrada = True
        else:
            # Buscar similitud con claves existentes
            for clave_existente, rs_canonica in clave_a_canonica.items():
                similitud = calcular_similitud(clave, clave_existente)
                if similitud >= umbral_similitud:
                    razon_canonica = rs_canonica
                    clave_a_canonica[clave] = rs_canonica
                    encontrada = True
                    break

            if not encontrada:
                clave_a_canonica[clave] = razon_social

        # Agregar registro al grupo
        if razon_canonica not in registros_por_grupo:
            registros_por_grupo[razon_canonica] = []
        registros_por_grupo[razon_canonica].append(registro)

    # Construir agrupaciones con totales
    agrupaciones = []
    for razon_social, regs in registros_por_grupo.items():
        total_debe = sum(r.get('debe', 0) or 0 for r in regs)
        total_haber = sum(r.get('haber', 0) or 0 for r in regs)

        # Recolectar variantes
        variantes = list(set(r.get('razon_social', razon_social) for r in regs))

        agrupacion = {
            'id': generar_id_agrupacion(razon_social),
            'razonSocial': razon_social,
            'registros': regs,
            'cantidad': len(regs),
            'totalDebe': round(total_debe, 2),
            'totalHaber': round(total_haber, 2),
            'saldo': round(total_debe - total_haber, 2),
            'variantes': variantes
        }
        agrupaciones.append(agrupacion)

    # Ordenar por saldo absoluto descendente
    agrupaciones.sort(key=lambda x: abs(x['saldo']), reverse=True)

    # Registros sin asignar
    sin_asignar = df_sin_asignar.to_dict('records')

    # Totales generales
    total_debe = df['debe'].sum() if 'debe' in df.columns else 0
    total_haber = df['haber'].sum() if 'haber' in df.columns else 0

    return {
        'agrupaciones': agrupaciones,
        'sin_asignar': sin_asignar,
        'totales': {
            'debe': round(total_debe, 2),
            'haber': round(total_haber, 2),
            'saldo': round(total_debe - total_haber, 2)
        },
        'estadisticas': {
            'total_registros': len(registros),
            'total_agrupaciones': len(agrupaciones),
            'registros_asignados': len(df_asignados),
            'registros_sin_asignar': len(sin_asignar)
        }
    }


def fusionar_agrupaciones(
    agrupacion_destino: dict,
    agrupacion_origen: dict
) -> dict:
    """
    Fusiona dos agrupaciones en una sola.

    Args:
        agrupacion_destino: Agrupación que recibirá los registros
        agrupacion_origen: Agrupación a fusionar

    Returns:
        Nueva agrupación fusionada
    """
    registros_combinados = (
        agrupacion_destino.get('registros', []) +
        agrupacion_origen.get('registros', [])
    )

    variantes_combinadas = list(set(
        agrupacion_destino.get('variantes', [agrupacion_destino['razonSocial']]) +
        agrupacion_origen.get('variantes', [agrupacion_origen['razonSocial']])
    ))

    total_debe = sum(r.get('debe', 0) or 0 for r in registros_combinados)
    total_haber = sum(r.get('haber', 0) or 0 for r in registros_combinados)

    return {
        'id': agrupacion_destino['id'],
        'razonSocial': agrupacion_destino['razonSocial'],
        'registros': registros_combinados,
        'cantidad': len(registros_combinados),
        'totalDebe': round(total_debe, 2),
        'totalHaber': round(total_haber, 2),
        'saldo': round(total_debe - total_haber, 2),
        'variantes': variantes_combinadas
    }
