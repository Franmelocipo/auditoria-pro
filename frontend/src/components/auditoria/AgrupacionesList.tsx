'use client'

import { useRef, useState, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight, GripVertical, Users, Search, X, ArrowRight, Check, Square, CheckSquare, Trash2 } from 'lucide-react'
import { useAuditoriaStore } from '@/stores/auditoriaStore'
import { AgrupacionMayor, RegistroMayor } from '@/types/auditoria'

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(valor)
}

interface AgrupacionItemProps {
  agrupacion: AgrupacionMayor
  isSelected: boolean
  isExpanded: boolean
  selectedRegistros: Set<string>
  onSelect: () => void
  onToggleExpand: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onMoverRegistroASinAsignar: (registroId: string) => void
  onToggleRegistro: (registroId: string) => void
  onToggleAllRegistros: (registroIds: string[], select: boolean) => void
  onMoverSeleccionadosASinAsignar: () => void
  onMoverSeleccionadosAOtraAgrupacion: () => void
  todasLasAgrupaciones: AgrupacionMayor[]
}

function AgrupacionItem({
  agrupacion,
  isSelected,
  isExpanded,
  selectedRegistros,
  onSelect,
  onToggleExpand,
  onDragStart,
  onDragOver,
  onDrop,
  onMoverRegistroASinAsignar,
  onToggleRegistro,
  onToggleAllRegistros,
  onMoverSeleccionadosASinAsignar,
  onMoverSeleccionadosAOtraAgrupacion,
  todasLasAgrupaciones
}: AgrupacionItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [mostrarModalDestino, setMostrarModalDestino] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
    onDragOver(e)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(e)
  }

  const saldoColor = (agrupacion.saldo || 0) >= 0 ? 'text-green-600' : 'text-red-600'

  // Calcular cuántos registros de esta agrupación están seleccionados
  const registrosVisibles = agrupacion.registros?.slice(0, 100) || []
  const registrosConId = registrosVisibles.filter(r => r.id)
  const cantidadSeleccionados = registrosConId.filter(r => r.id && selectedRegistros.has(r.id)).length
  const todosSeleccionados = registrosConId.length > 0 && cantidadSeleccionados === registrosConId.length
  const algunosSeleccionados = cantidadSeleccionados > 0 && cantidadSeleccionados < registrosConId.length

  return (
    <div
      className={`
        border rounded-lg mb-2 bg-white transition-all
        ${isSelected ? 'ring-2 ring-primary-500 border-primary-500' : 'border-gray-200'}
        ${isDragOver ? 'ring-2 ring-blue-400 bg-blue-50 border-blue-400' : ''}
      `}
      draggable
      onDragStart={onDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
        onClick={onSelect}
      >
        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {agrupacion.razonSocial || 'Sin nombre'}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {agrupacion.cantidad || agrupacion.registros?.length || 0} registros
            </span>
            {agrupacion.variantes && agrupacion.variantes.length > 1 && (
              <span className="text-xs text-blue-600">
                +{agrupacion.variantes.length - 1} variantes
              </span>
            )}
            {cantidadSeleccionados > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                {cantidadSeleccionados} seleccionados
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">
            <span className="text-green-600">{formatearMoneda(agrupacion.totalDebe || 0)}</span>
            {' / '}
            <span className="text-red-600">{formatearMoneda(agrupacion.totalHaber || 0)}</span>
          </div>
          <div className={`font-semibold ${saldoColor}`}>
            {formatearMoneda(agrupacion.saldo || 0)}
          </div>
        </div>
      </div>

      {/* Indicador de drop */}
      {isDragOver && (
        <div className="px-3 pb-2 text-sm text-blue-600 font-medium">
          Soltar aqui para agregar
        </div>
      )}

      {/* Registros expandidos */}
      {isExpanded && (
        <div className="border-t bg-gray-50">
          {agrupacion.registros && agrupacion.registros.length > 0 ? (
            <>
              {/* Barra de acciones masivas */}
              {cantidadSeleccionados > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border-b">
                  <span className="text-sm text-primary-700 font-medium">
                    {cantidadSeleccionados} registro{cantidadSeleccionados !== 1 ? 's' : ''} seleccionado{cantidadSeleccionados !== 1 ? 's' : ''}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoverSeleccionadosASinAsignar()
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Mover a Sin Asignar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMostrarModalDestino(true)
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Mover a Otra Agrupación
                  </button>
                </div>
              )}

              {/* Modal para seleccionar destino */}
              {mostrarModalDestino && (
                <div className="px-3 py-2 bg-blue-50 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-blue-700 font-medium">Seleccionar agrupación destino:</span>
                    <button
                      onClick={() => setMostrarModalDestino(false)}
                      className="ml-auto p-1 hover:bg-blue-100 rounded"
                    >
                      <X className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                  <div className="max-h-40 overflow-auto">
                    {todasLasAgrupaciones
                      .filter(a => a.id !== agrupacion.id)
                      .slice(0, 20)
                      .map(a => (
                        <button
                          key={a.id}
                          onClick={() => {
                            onMoverSeleccionadosAOtraAgrupacion()
                            setMostrarModalDestino(false)
                          }}
                          data-destino-id={a.id}
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-100 rounded truncate"
                        >
                          {a.razonSocial}
                        </button>
                      ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar agrupación..."
                    className="w-full mt-2 px-2 py-1 text-sm border rounded"
                    onChange={(e) => {
                      // Filtrar agrupaciones visibles basado en el input
                      const filtro = e.target.value.toLowerCase()
                      const container = e.target.previousElementSibling
                      if (container) {
                        const buttons = container.querySelectorAll('button')
                        buttons.forEach((btn) => {
                          const text = btn.textContent?.toLowerCase() || ''
                          (btn as HTMLElement).style.display = text.includes(filtro) ? 'block' : 'none'
                        })
                      }
                    }}
                  />
                </div>
              )}

              {/* Tabla de registros */}
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-center w-8">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const ids = registrosConId.map(r => r.id!).filter(Boolean)
                            onToggleAllRegistros(ids, !todosSeleccionados)
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          title={todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        >
                          {todosSeleccionados ? (
                            <CheckSquare className="w-4 h-4 text-primary-600" />
                          ) : algunosSeleccionados ? (
                            <div className="w-4 h-4 border-2 border-primary-600 bg-primary-100 rounded" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-8">#</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Descripcion</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Debe</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Haber</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-10">Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosVisibles.map((registro, idx) => {
                      const isChecked = registro.id ? selectedRegistros.has(registro.id) : false
                      return (
                        <tr
                          key={registro.id || idx}
                          className={`border-b border-gray-100 hover:bg-white group ${isChecked ? 'bg-primary-50' : ''}`}
                        >
                          <td className="px-2 py-2 text-center">
                            {registro.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleRegistro(registro.id!)
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-primary-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-2 py-2 text-gray-400 text-xs">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                            {registro.fecha ? new Date(registro.fecha).toLocaleDateString('es-AR') : '-'}
                          </td>
                          <td className="px-3 py-2 text-gray-800 truncate max-w-xs" title={registro.descripcion || registro.concepto || ''}>
                            {registro.descripcion || registro.concepto || '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-green-600 whitespace-nowrap">
                            {registro.debe ? formatearMoneda(registro.debe) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-red-600 whitespace-nowrap">
                            {registro.haber ? formatearMoneda(registro.haber) : '-'}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (registro.id) {
                                  onMoverRegistroASinAsignar(registro.id)
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-yellow-100 rounded text-yellow-600 transition-opacity"
                              title="Mover a sin asignar"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {agrupacion.registros.length > 100 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-2 text-center text-gray-500 italic">
                          ... y {agrupacion.registros.length - 100} registros mas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              <p>Los registros no están cargados en detalle.</p>
              <p className="text-xs mt-1">Cantidad reportada: {agrupacion.cantidad || 0}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AgrupacionesList() {
  const parentRef = useRef<HTMLDivElement>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  const [mostrarTodos, setMostrarTodos] = useState(false)
  // Estado para registros seleccionados por agrupación
  const [selectedRegistrosPorAgrupacion, setSelectedRegistrosPorAgrupacion] = useState<Map<string, Set<string>>>(new Map())
  // Modal para mover a otra agrupación
  const [modalMoverAbierto, setModalMoverAbierto] = useState<string | null>(null)
  const [busquedaDestino, setBusquedaDestino] = useState('')

  const LIMITE_INICIAL = 50

  const {
    agrupaciones,
    agrupacionSeleccionada,
    setAgrupacionSeleccionada,
    fusionarAgrupaciones,
    moverAAgrupacion,
    moverASinAsignar,
    moverRegistrosASinAsignar,
    moverRegistrosAOtraAgrupacion
  } = useAuditoriaStore()

  // Asegurar que cada agrupación tenga un ID único
  const agrupacionesConId = useMemo(() => {
    return agrupaciones.map((a, index) => ({
      ...a,
      id: a.id || `agrup-${index}-${a.razonSocial?.substring(0, 20) || 'sin-nombre'}`
    }))
  }, [agrupaciones])

  // Filtrar agrupaciones
  const agrupacionesFiltradas = useMemo(() => {
    if (!filtro.trim()) return agrupacionesConId

    const filtroLower = filtro.toLowerCase()
    return agrupacionesConId.filter(a =>
      a.razonSocial?.toLowerCase().includes(filtroLower) ||
      a.variantes?.some(v => v.toLowerCase().includes(filtroLower))
    )
  }, [agrupacionesConId, filtro])

  // Aplicar límite para evitar renderizar miles de items
  const agrupacionesVisibles = useMemo(() => {
    if (mostrarTodos || agrupacionesFiltradas.length <= LIMITE_INICIAL) {
      return agrupacionesFiltradas
    }
    return agrupacionesFiltradas.slice(0, LIMITE_INICIAL)
  }, [agrupacionesFiltradas, mostrarTodos])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleDragStart = (e: React.DragEvent, agrupacion: AgrupacionMayor) => {
    e.dataTransfer.setData('agrupacionId', agrupacion.id || '')
    e.dataTransfer.setData('type', 'agrupacion')
    e.dataTransfer.effectAllowed = 'move'
    setDraggedId(agrupacion.id || null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetAgrupacion: AgrupacionMayor) => {
    e.preventDefault()

    const type = e.dataTransfer.getData('type')

    if (type === 'agrupacion') {
      const sourceId = e.dataTransfer.getData('agrupacionId')
      if (sourceId && sourceId !== targetAgrupacion.id) {
        fusionarAgrupaciones(targetAgrupacion.id!, sourceId)
      }
    } else if (type === 'registro') {
      const registroId = e.dataTransfer.getData('registroId')
      if (registroId && targetAgrupacion.id) {
        moverAAgrupacion(registroId, targetAgrupacion.id)
      }
    }

    setDraggedId(null)
  }

  const handleMoverRegistroASinAsignar = (agrupacionId: string, registroId: string) => {
    moverASinAsignar(agrupacionId, registroId)
    // Limpiar selección para este registro
    setSelectedRegistrosPorAgrupacion(prev => {
      const next = new Map(prev)
      const set = next.get(agrupacionId)
      if (set) {
        set.delete(registroId)
        if (set.size === 0) {
          next.delete(agrupacionId)
        }
      }
      return next
    })
  }

  const handleToggleRegistro = useCallback((agrupacionId: string, registroId: string) => {
    setSelectedRegistrosPorAgrupacion(prev => {
      const next = new Map(prev)
      const set = next.get(agrupacionId) || new Set<string>()
      if (set.has(registroId)) {
        set.delete(registroId)
      } else {
        set.add(registroId)
      }
      if (set.size === 0) {
        next.delete(agrupacionId)
      } else {
        next.set(agrupacionId, set)
      }
      return next
    })
  }, [])

  const handleToggleAllRegistros = useCallback((agrupacionId: string, registroIds: string[], select: boolean) => {
    setSelectedRegistrosPorAgrupacion(prev => {
      const next = new Map(prev)
      if (select) {
        next.set(agrupacionId, new Set(registroIds))
      } else {
        next.delete(agrupacionId)
      }
      return next
    })
  }, [])

  const handleMoverSeleccionadosASinAsignar = useCallback((agrupacionId: string) => {
    const selected = selectedRegistrosPorAgrupacion.get(agrupacionId)
    if (selected && selected.size > 0) {
      moverRegistrosASinAsignar(agrupacionId, Array.from(selected))
      // Limpiar selección
      setSelectedRegistrosPorAgrupacion(prev => {
        const next = new Map(prev)
        next.delete(agrupacionId)
        return next
      })
    }
  }, [selectedRegistrosPorAgrupacion, moverRegistrosASinAsignar])

  const handleMoverSeleccionadosAOtraAgrupacion = useCallback((origenId: string, destinoId: string) => {
    const selected = selectedRegistrosPorAgrupacion.get(origenId)
    if (selected && selected.size > 0) {
      moverRegistrosAOtraAgrupacion(origenId, destinoId, Array.from(selected))
      // Limpiar selección
      setSelectedRegistrosPorAgrupacion(prev => {
        const next = new Map(prev)
        next.delete(origenId)
        return next
      })
      setModalMoverAbierto(null)
      setBusquedaDestino('')
    }
  }, [selectedRegistrosPorAgrupacion, moverRegistrosAOtraAgrupacion])

  if (agrupaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Users className="w-12 h-12 mb-4 text-gray-300" />
        <p>No hay agrupaciones para mostrar</p>
        <p className="text-sm">Sube un archivo Excel para comenzar</p>
      </div>
    )
  }

  // Filtrar agrupaciones destino para el modal
  const agrupacionesDestinoFiltradas = agrupacionesConId.filter(a => {
    if (a.id === modalMoverAbierto) return false
    if (!busquedaDestino.trim()) return true
    return a.razonSocial?.toLowerCase().includes(busquedaDestino.toLowerCase())
  }).slice(0, 30)

  return (
    <div className="space-y-3">
      {/* Modal global para mover a otra agrupación */}
      {modalMoverAbierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setModalMoverAbierto(null)}>
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Mover registros seleccionados</h3>
              <button
                onClick={() => setModalMoverAbierto(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-gray-600 mb-3">
                Selecciona la agrupación de destino:
              </p>
              <input
                type="text"
                placeholder="Buscar agrupación..."
                value={busquedaDestino}
                onChange={(e) => setBusquedaDestino(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-auto px-4 pb-4">
              <div className="space-y-1">
                {agrupacionesDestinoFiltradas.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleMoverSeleccionadosAOtraAgrupacion(modalMoverAbierto, a.id)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-primary-50 hover:text-primary-700 transition-colors"
                  >
                    <div className="font-medium truncate">{a.razonSocial}</div>
                    <div className="text-xs text-gray-500">
                      {a.cantidad || a.registros?.length || 0} registros
                    </div>
                  </button>
                ))}
                {agrupacionesDestinoFiltradas.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No se encontraron agrupaciones</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar razon social..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        {filtro && (
          <button
            onClick={() => setFiltro('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info de filtrado */}
      {filtro && (
        <p className="text-sm text-gray-500">
          Mostrando {agrupacionesFiltradas.length} de {agrupaciones.length} agrupaciones
        </p>
      )}

      {/* Lista de agrupaciones */}
      <div
        ref={parentRef}
        className="max-h-[600px] overflow-auto"
      >
        {agrupacionesVisibles.map((agrupacion) => (
          <AgrupacionItem
            key={agrupacion.id}
            agrupacion={agrupacion}
            isSelected={agrupacionSeleccionada === agrupacion.id}
            isExpanded={expandedIds.has(agrupacion.id)}
            selectedRegistros={selectedRegistrosPorAgrupacion.get(agrupacion.id) || new Set()}
            onSelect={() => setAgrupacionSeleccionada(agrupacion.id || null)}
            onToggleExpand={() => toggleExpand(agrupacion.id)}
            onDragStart={(e) => handleDragStart(e, agrupacion)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, agrupacion)}
            onMoverRegistroASinAsignar={(registroId) =>
              handleMoverRegistroASinAsignar(agrupacion.id || '', registroId)
            }
            onToggleRegistro={(registroId) => handleToggleRegistro(agrupacion.id, registroId)}
            onToggleAllRegistros={(registroIds, select) => handleToggleAllRegistros(agrupacion.id, registroIds, select)}
            onMoverSeleccionadosASinAsignar={() => handleMoverSeleccionadosASinAsignar(agrupacion.id)}
            onMoverSeleccionadosAOtraAgrupacion={() => setModalMoverAbierto(agrupacion.id)}
            todasLasAgrupaciones={agrupacionesConId}
          />
        ))}

        {/* Botón para mostrar más */}
        {!mostrarTodos && agrupacionesFiltradas.length > LIMITE_INICIAL && (
          <div className="py-4 text-center">
            <button
              onClick={() => setMostrarTodos(true)}
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
            >
              Mostrar {agrupacionesFiltradas.length - LIMITE_INICIAL} agrupaciones más
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
