from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class RegistroMayor(BaseModel):
    """Un registro individual del mayor contable"""
    id: Optional[str] = None
    fecha: Optional[str] = None
    concepto: Optional[str] = None
    debe: Optional[float] = 0
    haber: Optional[float] = 0
    saldo: Optional[float] = 0
    cuenta: Optional[str] = None
    comprobante: Optional[str] = None
    # Campos adicionales flexibles
    extra: Optional[dict] = None

    class Config:
        extra = "allow"


class AgrupacionMayor(BaseModel):
    """Una agrupación de registros (por razón social, etc.)"""
    id: Optional[str] = None
    razonSocial: Optional[str] = None
    registros: List[Any] = []
    totalDebe: Optional[float] = 0
    totalHaber: Optional[float] = 0
    saldo: Optional[float] = 0
    comentarios: Optional[str] = None
    estado: Optional[str] = None
    color: Optional[str] = None

    class Config:
        extra = "allow"


class ConciliacionCreate(BaseModel):
    """Datos para crear o actualizar una conciliación"""
    id: Optional[int] = None
    nombre: str
    cliente_id: Optional[int] = None
    registros: Optional[List[RegistroMayor]] = []
    agrupaciones: Optional[List[AgrupacionMayor]] = []


class ConciliacionResponse(BaseModel):
    """Respuesta con datos de una conciliación"""
    id: int
    nombre: str
    cliente_id: Optional[int] = None
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
    cliente_id: Optional[int] = None
    fecha_creacion: Optional[datetime] = None
    fecha_modificacion: Optional[datetime] = None
    registros_count: Optional[int] = 0
    agrupaciones_count: Optional[int] = 0


class ConciliacionListResponse(BaseModel):
    """Respuesta de listado de conciliaciones"""
    conciliaciones: List[ConciliacionListItem]
    total: int
