'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronRight, GripVertical, Users, Search, X, ArrowRight } from 'lucide-react'
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
  onSelect: () => void
  onToggleExpand: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onMoverRegistroASinAsignar: (registroId: string) => void
}

function AgrupacionItem({
  agrupacion,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onDragStart,
  onDragOver,
  onDrop,
  onMoverRegistroASinAsignar
}: AgrupacionItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
    onDragOver(e)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Solo quitar el estado si realmente salimos del elemento
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
        <div className="border-t bg-gray-50 max-h-80 overflow-auto">
          {agrupacion.registros && agrupacion.registros.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 w-8"></th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Descripcion</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Debe</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Haber</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-10">Acc.</th>
                </tr>
              </thead>
              <tbody>
                {agrupacion.registros.slice(0, 100).map((registro, idx) => (
                  <tr key={registro.id || idx} className="border-b border-gray-100 hover:bg-white group">
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
                ))}
                {agrupacion.registros.length > 100 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-center text-gray-500 italic">
                      ... y {agrupacion.registros.length - 100} registros mas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
  const LIMITE_INICIAL = 50

  const {
    agrupaciones,
    agrupacionSeleccionada,
    setAgrupacionSeleccionada,
    fusionarAgrupaciones,
    moverAAgrupacion,
    moverASinAsignar
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
      // Fusionar agrupaciones
      const sourceId = e.dataTransfer.getData('agrupacionId')
      if (sourceId && sourceId !== targetAgrupacion.id) {
        fusionarAgrupaciones(targetAgrupacion.id!, sourceId)
      }
    } else if (type === 'registro') {
      // Mover registro desde sin asignar
      const registroId = e.dataTransfer.getData('registroId')
      if (registroId && targetAgrupacion.id) {
        moverAAgrupacion(registroId, targetAgrupacion.id)
      }
    }

    setDraggedId(null)
  }

  const handleMoverRegistroASinAsignar = (agrupacionId: string, registroId: string) => {
    moverASinAsignar(agrupacionId, registroId)
  }

  if (agrupaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Users className="w-12 h-12 mb-4 text-gray-300" />
        <p>No hay agrupaciones para mostrar</p>
        <p className="text-sm">Sube un archivo Excel para comenzar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
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
            onSelect={() => setAgrupacionSeleccionada(agrupacion.id || null)}
            onToggleExpand={() => toggleExpand(agrupacion.id)}
            onDragStart={(e) => handleDragStart(e, agrupacion)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, agrupacion)}
            onMoverRegistroASinAsignar={(registroId) =>
              handleMoverRegistroASinAsignar(agrupacion.id || '', registroId)
            }
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
