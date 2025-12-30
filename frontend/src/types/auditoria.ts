export interface RegistroMayor {
  id?: string
  fecha?: string
  concepto?: string
  debe?: number
  haber?: number
  saldo?: number
  cuenta?: string
  comprobante?: string
  [key: string]: any
}

export interface AgrupacionMayor {
  id?: string
  razonSocial?: string
  registros: RegistroMayor[]
  totalDebe?: number
  totalHaber?: number
  saldo?: number
  comentarios?: string
  estado?: string
  color?: string
}

export interface Conciliacion {
  id?: number
  nombre: string
  cliente_id?: number
  fecha_creacion?: string
  fecha_modificacion?: string
  registros_count?: number
  agrupaciones_count?: number
  registros?: RegistroMayor[]
  agrupaciones?: AgrupacionMayor[]
}

export interface Cliente {
  id: number
  nombre: string
  cuit?: string
}
