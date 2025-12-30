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
