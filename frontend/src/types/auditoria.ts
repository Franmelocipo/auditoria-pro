export interface RegistroMayor {
  id?: string
  fecha?: string
  concepto?: string
  descripcion?: string
  debe?: number
  haber?: number
  saldo?: number
  cuenta?: string
  comprobante?: string
  razonSocial?: string
  [key: string]: any
}

export interface AgrupacionMayor {
  id?: string
  razonSocial?: string
  registros: RegistroMayor[]
  cantidad?: number
  totalDebe?: number
  totalHaber?: number
  saldo?: number
  comentarios?: string
  estado?: string
  color?: string
  variantes?: string[]
  // Campos para cuadro comparativo
  saldoInicio?: number
  saldoCierre?: number
  ajusteAuditoria?: number
  notaAjuste?: string
}

// Saldo por razón social (para cargar desde Excel)
export interface SaldoRazonSocial {
  razonSocial: string
  saldo: number
}

// Fila del cuadro comparativo
export interface FilaCuadroComparativo {
  razonSocial: string
  saldoInicio: number
  debe: number
  haber: number
  saldoCalculado: number  // saldoInicio + debe - haber
  ajusteAuditoria: number
  saldoReportado: number  // saldoCierre
  diferencia: number      // saldoCalculado + ajuste - saldoReportado
  estado: 'ok' | 'diferencia' | 'sin_cierre'
  notaAjuste?: string
}

export interface Conciliacion {
  id?: number
  nombre: string
  cliente_id?: string
  fecha_creacion?: string
  fecha_modificacion?: string
  registros_count?: number
  agrupaciones_count?: number
  registros?: RegistroMayor[]
  agrupaciones?: AgrupacionMayor[]
  // Datos adicionales para el cuadro comparativo
  saldosInicio?: SaldoRazonSocial[]
  saldosCierre?: SaldoRazonSocial[]
  mayorIncluyeApertura?: boolean
}

export interface Cliente {
  id: string
  nombre: string
  cuit?: string
}
