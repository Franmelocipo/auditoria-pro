'use client'

import { useState, useEffect } from 'react'
import { Save, FolderOpen, Trash2, RefreshCw, User } from 'lucide-react'
import { ExcelUploader } from '@/components/auditoria/ExcelUploader'
import { AgrupacionesList } from '@/components/auditoria/AgrupacionesList'
import { Estadisticas } from '@/components/auditoria/Estadisticas'
import { SinAsignar } from '@/components/auditoria/SinAsignar'
import { useAuditoriaStore } from '@/stores/auditoriaStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Cliente {
  id: number
  nombre: string
  cuit?: string
}

export default function AuditoriaPage() {
  const [saving, setSaving] = useState(false)
  const [nombreConciliacion, setNombreConciliacion] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [dbConfigured, setDbConfigured] = useState(true)

  const {
    registros,
    agrupaciones,
    sinAsignar,
    loading,
    error,
    limpiar,
    setError
  } = useAuditoriaStore()

  const tieneData = registros.length > 0 || agrupaciones.length > 0

  // Cargar clientes al montar
  useEffect(() => {
    const fetchClientes = async () => {
      setLoadingClientes(true)
      try {
        const response = await fetch(`${API_URL}/api/auditoria/clientes`)
        if (response.status === 503) {
          // DB no configurada
          setDbConfigured(false)
          return
        }
        if (response.ok) {
          const data = await response.json()
          setClientes(data.clientes || [])
          setDbConfigured(true)
        }
      } catch (err) {
        console.error('Error cargando clientes:', err)
        setDbConfigured(false)
      } finally {
        setLoadingClientes(false)
      }
    }
    fetchClientes()
  }, [])

  const handleGuardar = async () => {
    if (!nombreConciliacion.trim()) {
      setError('Ingresa un nombre para la conciliacion')
      return
    }

    if (!dbConfigured) {
      setError('La base de datos no está configurada. Contacte al administrador.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/auditoria/conciliaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreConciliacion,
          cliente_id: clienteId,
          registros: registros,
          agrupaciones: agrupaciones.map(a => ({
            ...a,
            registros: a.registros || []
          }))
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al guardar')
      }

      const data = await response.json()
      alert(`Conciliacion guardada con ID: ${data.id}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleLimpiar = () => {
    if (confirm('Estas seguro de limpiar todos los datos?')) {
      limpiar()
      setNombreConciliacion('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Analisis de Mayores
          </h1>
          <p className="text-gray-600">
            Agrupa y analiza registros de mayores contables por razon social
          </p>
        </div>

        {tieneData && (
          <div className="flex items-center gap-3">
            {/* Selector de cliente */}
            <select
              value={clienteId || ''}
              onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border rounded-lg text-sm w-48"
              disabled={loadingClientes || !dbConfigured}
            >
              <option value="">
                {!dbConfigured ? 'DB no configurada' :
                 loadingClientes ? 'Cargando...' :
                 '-- Seleccionar cliente --'}
              </option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Nombre de la conciliacion..."
              value={nombreConciliacion}
              onChange={(e) => setNombreConciliacion(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm w-64"
            />
            <button
              onClick={handleGuardar}
              disabled={saving || !dbConfigured}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleLimpiar}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
          <span className="ml-2 text-gray-600">Procesando...</span>
        </div>
      )}

      {/* Upload o Contenido */}
      {!tieneData ? (
        <div className="max-w-xl mx-auto py-12">
          <ExcelUploader />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal - Agrupaciones */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">
                  Agrupaciones por Razon Social
                </h2>
                <span className="text-sm text-gray-500">
                  {agrupaciones.length} grupos
                </span>
              </div>
              <AgrupacionesList />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Estadisticas />
            <SinAsignar />

            {/* Cargar otro archivo */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium text-gray-700 mb-3">Cargar otro archivo</h3>
              <ExcelUploader />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
