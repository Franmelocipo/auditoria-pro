from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class ConciliacionCreate(BaseModel):
    """Datos para crear o actualizar una conciliación"""
    id: Optional[int] = None
    nombre: str
    cliente_id: Optional[str] = None
    registros: Optional[List[Any]] = []  # Flexible para aceptar cualquier estructura
    agrupaciones: Optional[List[Any]] = []  # Flexible para aceptar cualquier estructura

    class Config:
        extra = "allow"


class ConciliacionResponse(BaseModel):
    """Respuesta con datos de una conciliación"""
    id: int
    nombre: str
    cliente_id: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    fecha_modificacion: Optional[datetime] = None
    registros_count: Optional[int] = 0
    agrupaciones_count: Optional[int] = 0
    registros: Optional[List[Any]] = []
    agrupaciones: Optional[List[Any]] = []
    registros_guardados_separado: Optional[bool] = False
    agrupaciones_guardadas_separado: Optional[bool] = False

    class Config:
        extra = "allow"


class ConciliacionListItem(BaseModel):
    """Item resumido para listados"""
    id: int
    nombre: str
    cliente_id: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    fecha_modificacion: Optional[datetime] = None
    registros_count: Optional[int] = 0
    agrupaciones_count: Optional[int] = 0


class ConciliacionListResponse(BaseModel):
    """Respuesta de listado de conciliaciones"""
    conciliaciones: List[ConciliacionListItem]
    total: int


class FusionRequest(BaseModel):
    """Request para fusionar dos agrupaciones"""
    agrupacion_destino: dict
    agrupacion_origen: dict
