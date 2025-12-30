'use client'

import { useState, useEffect } from 'react'
import { Save, FolderOpen, Trash2, RefreshCw, User, ChevronRight } from 'lucide-react'
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
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [dbConfigured, setDbConfigured] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

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
      setDbError(null)
      try {
        const response = await fetch(`${API_URL}/api/auditoria/clientes`)
        if (!response.ok) {
          const data = await response.json()
          setDbError(data.detail || `Error ${response.status}`)
          setDbConfigured(false)
          return
        }
        const data = await response.json()
        setClientes(data.clientes || [])
        setDbConfigured(true)
      } catch (err) {
        console.error('Error cargando clientes:', err)
        setDbError('Error de conexión')
        setDbConfigured(false)
      } finally {
        setLoadingClientes(false)
      }
    }
    fetchClientes()
  }, [])

  const handleSeleccionarCliente = (id: number) => {
    const cliente = clientes.find(c => c.id === id)
    if (cliente) {
      setClienteId(id)
      setClienteSeleccionado(cliente)
    }
  }

  const handleCambiarCliente = () => {
    setClienteSeleccionado(null)
    setClienteId(null)
    limpiar()
  }

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
            {clienteSeleccionado
              ? `Cliente: ${clienteSeleccionado.nombre}`
              : 'Selecciona un cliente para comenzar'}
          </p>
        </div>

        {clienteSeleccionado && tieneData && (
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Nombre de la conciliacion..."
              value={nombreConciliacion}
              onChange={(e) => setNombreConciliacion(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm w-64"
            />
            <button
              onClick={handleGuardar}
              disabled={saving}
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
            <button
              onClick={handleCambiarCliente}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <User className="w-4 h-4" />
              Cambiar cliente
            </button>
          </div>
        )}
      </div>

      {/* Error de DB */}
      {dbError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error de base de datos: {dbError}
        </div>
      )}

      {/* Error general */}
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

      {/* PASO 1: Seleccionar cliente */}
      {!clienteSeleccionado && (
        <div className="max-w-2xl mx-auto py-8">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Seleccionar Cliente
            </h2>

            {loadingClientes ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
                <span className="ml-2 text-gray-600">Cargando clientes...</span>
              </div>
            ) : clientes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay clientes disponibles
              </p>
            ) : (
              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {clientes.map(cliente => (
                  <button
                    key={cliente.id}
                    onClick={() => handleSeleccionarCliente(cliente.id)}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-colors text-left"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{cliente.nombre}</div>
                      {cliente.cuit && (
                        <div className="text-sm text-gray-500">CUIT: {cliente.cuit}</div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PASO 2: Cargar Excel (solo si hay cliente seleccionado) */}
      {clienteSeleccionado && !tieneData && (
        <div className="max-w-xl mx-auto py-12">
          <ExcelUploader />
        </div>
      )}

      {/* PASO 3: Mostrar agrupaciones */}
      {clienteSeleccionado && tieneData && (
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
