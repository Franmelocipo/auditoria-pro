'use client'

import { useState, useEffect } from 'react'
import { Save, Trash2, RefreshCw, User, ChevronRight, Plus, FileSpreadsheet, Calendar, LayoutList, Table2 } from 'lucide-react'
import { ExcelUploader } from '@/components/auditoria/ExcelUploader'
import { AgrupacionesList } from '@/components/auditoria/AgrupacionesList'
import { Estadisticas } from '@/components/auditoria/Estadisticas'
import { SinAsignar } from '@/components/auditoria/SinAsignar'
import { SaldosUploader } from '@/components/auditoria/SaldosUploader'
import { CuadroComparativo } from '@/components/auditoria/CuadroComparativo'
import { useAuditoriaStore } from '@/stores/auditoriaStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Cliente {
  id: string
  nombre: string
  cuit?: string
}

interface ConciliacionItem {
  id: number
  nombre: string
  fecha_creacion: string
  fecha_modificacion: string
  registros_count: number
  agrupaciones_count: number
}

export default function AuditoriaPage() {
  const [saving, setSaving] = useState(false)
  const [nombreConciliacion, setNombreConciliacion] = useState('')
  const [conciliacionId, setConciliacionId] = useState<number | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [dbConfigured, setDbConfigured] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

  // Estado para conciliaciones guardadas
  const [conciliaciones, setConciliaciones] = useState<ConciliacionItem[]>([])
  const [loadingConciliaciones, setLoadingConciliaciones] = useState(false)
  const [modoNuevo, setModoNuevo] = useState(false)

  const {
    registros,
    agrupaciones,
    sinAsignar,
    saldosInicio,
    saldosCierre,
    loading,
    error,
    tabActiva,
    limpiar,
    setError,
    setRegistros,
    setAgrupaciones,
    setSinAsignar,
    setLoading,
    setTabActiva,
    setSaldosInicio,
    setSaldosCierre,
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
        setDbError('Error de conexion')
        setDbConfigured(false)
      } finally {
        setLoadingClientes(false)
      }
    }
    fetchClientes()
  }, [])

  // Cargar conciliaciones cuando se selecciona un cliente
  useEffect(() => {
    if (!clienteId) {
      setConciliaciones([])
      return
    }

    const fetchConciliaciones = async () => {
      setLoadingConciliaciones(true)
      try {
        const response = await fetch(`${API_URL}/api/auditoria/conciliaciones?cliente_id=${clienteId}`)
        if (response.ok) {
          const data = await response.json()
          setConciliaciones(data.conciliaciones || [])
        }
      } catch (err) {
        console.error('Error cargando conciliaciones:', err)
      } finally {
        setLoadingConciliaciones(false)
      }
    }
    fetchConciliaciones()
  }, [clienteId])

  const handleSeleccionarCliente = (id: string) => {
    const cliente = clientes.find(c => c.id === id)
    if (cliente) {
      setClienteId(id)
      setClienteSeleccionado(cliente)
      setModoNuevo(false)
      limpiar()
    }
  }

  const handleCambiarCliente = () => {
    setClienteSeleccionado(null)
    setClienteId(null)
    setConciliaciones([])
    setModoNuevo(false)
    setConciliacionId(null)
    setNombreConciliacion('')
    limpiar()
  }

  const handleNuevaConciliacion = () => {
    setModoNuevo(true)
    setConciliacionId(null)
    setNombreConciliacion('')
    limpiar()
  }

  const handleCargarConciliacion = async (id: number) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/auditoria/conciliaciones/${id}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al cargar conciliacion')
      }

      const data = await response.json()

      setConciliacionId(id)
      setNombreConciliacion(data.nombre || '')
      setRegistros(data.registros || [])
      setAgrupaciones(data.agrupaciones || [])
      setSinAsignar([])
      // Cargar saldos si existen
      if (data.saldosInicio) setSaldosInicio(data.saldosInicio)
      if (data.saldosCierre) setSaldosCierre(data.saldosCierre)
      setModoNuevo(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  const handleGuardar = async () => {
    if (!nombreConciliacion.trim()) {
      setError('Ingresa un nombre para la conciliacion')
      return
    }

    if (!dbConfigured) {
      setError('La base de datos no esta configurada. Contacte al administrador.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/auditoria/conciliaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conciliacionId,
          nombre: nombreConciliacion,
          cliente_id: clienteId,
          registros: registros,
          agrupaciones: agrupaciones.map(a => ({
            ...a,
            registros: a.registros || []
          })),
          saldosInicio: saldosInicio,
          saldosCierre: saldosCierre,
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al guardar')
      }

      const data = await response.json()

      if (!conciliacionId) {
        setConciliacionId(data.id)
      }

      if (clienteId) {
        const listResponse = await fetch(`${API_URL}/api/auditoria/conciliaciones?cliente_id=${clienteId}`)
        if (listResponse.ok) {
          const listData = await listResponse.json()
          setConciliaciones(listData.conciliaciones || [])
        }
      }

      alert(`Conciliacion guardada correctamente`)

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
      setConciliacionId(null)
      setModoNuevo(false)
    }
  }

  const formatFecha = (fecha: string) => {
    if (!fecha) return ''
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
          {typeof error === 'string' ? error : JSON.stringify(error)}
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

      {/* PASO 2: Seleccionar conciliacion existente o crear nueva */}
      {clienteSeleccionado && !tieneData && !modoNuevo && (
        <div className="max-w-2xl mx-auto py-8">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Conciliaciones de {clienteSeleccionado.nombre}
              </h2>
              <button
                onClick={handleCambiarCliente}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cambiar cliente
              </button>
            </div>

            <button
              onClick={handleNuevaConciliacion}
              className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-primary-300 rounded-lg text-primary-600 hover:bg-primary-50 hover:border-primary-400 transition-colors mb-4"
            >
              <Plus className="w-5 h-5" />
              Nueva conciliacion (cargar Excel)
            </button>

            {loadingConciliaciones ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
                <span className="ml-2 text-gray-600">Cargando conciliaciones...</span>
              </div>
            ) : conciliaciones.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay conciliaciones guardadas para este cliente
              </p>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Conciliaciones guardadas:
                </h3>
                {conciliaciones.map(conc => (
                  <button
                    key={conc.id}
                    onClick={() => handleCargarConciliacion(conc.id)}
                    className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">{conc.nombre}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-4">
                          <span>{conc.registros_count} registros</span>
                          <span>{conc.agrupaciones_count} agrupaciones</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatFecha(conc.fecha_modificacion)}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PASO 2b: Cargar Excel (modo nuevo) */}
      {clienteSeleccionado && !tieneData && modoNuevo && (
        <div className="max-w-xl mx-auto py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Nueva conciliacion
            </h2>
            <button
              onClick={() => setModoNuevo(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Volver
            </button>
          </div>
          <ExcelUploader />
        </div>
      )}

      {/* PASO 3: Panel principal con datos */}
      {clienteSeleccionado && tieneData && (
        <div className="space-y-4">
          {/* Saldos de Inicio y Cierre */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Table2 className="w-5 h-5 text-blue-600" />
              Saldos de Inicio y Cierre
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Cargue los listados de saldos para comparar con los movimientos del mayor.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SaldosUploader tipo="inicio" />
              <SaldosUploader tipo="cierre" />
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="flex border-b">
              <button
                onClick={() => setTabActiva('agrupaciones')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                  tabActiva === 'agrupaciones'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <LayoutList className="w-4 h-4" />
                Agrupaciones
              </button>
              <button
                onClick={() => setTabActiva('cuadro')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                  tabActiva === 'cuadro'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Table2 className="w-4 h-4" />
                Cuadro Comparativo
              </button>
            </div>

            <div className="p-4">
              {tabActiva === 'agrupaciones' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Columna principal - Agrupaciones */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-semibold text-gray-900">
                        Agrupaciones por Razon Social
                      </h2>
                      <span className="text-sm text-gray-500">
                        {agrupaciones.length} grupos
                      </span>
                    </div>
                    <AgrupacionesList />
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-4">
                    <Estadisticas />
                    <SinAsignar />

                    {/* Cargar otro archivo */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-700 mb-3">Cargar otro archivo</h3>
                      <ExcelUploader />
                    </div>
                  </div>
                </div>
              ) : (
                <CuadroComparativo />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
