import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// API de Auditoría
export const auditoriaApi = {
  // Listar conciliaciones
  listarConciliaciones: async (clienteId?: number) => {
    const params = clienteId ? { cliente_id: clienteId } : {}
    const response = await api.get('/api/auditoria/conciliaciones', { params })
    return response.data
  },

  // Obtener una conciliación
  obtenerConciliacion: async (id: number) => {
    const response = await api.get(`/api/auditoria/conciliaciones/${id}`)
    return response.data
  },

  // Guardar conciliación
  guardarConciliacion: async (data: {
    id?: number
    nombre: string
    cliente_id?: number
    registros: any[]
    agrupaciones: any[]
  }) => {
    const response = await api.post('/api/auditoria/conciliaciones', data)
    return response.data
  },

  // Eliminar conciliación
  eliminarConciliacion: async (id: number) => {
    const response = await api.delete(`/api/auditoria/conciliaciones/${id}`)
    return response.data
  },

  // Procesar Excel
  procesarExcel: async (file: File) => {
    const formData = new FormData()
    formData.append('archivo', file)
    const response = await api.post('/api/auditoria/procesar-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
