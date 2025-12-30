'use client'

import { useRef, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronRight, GripVertical, Users, DollarSign } from 'lucide-react'
import { useAuditoriaStore } from '@/stores/auditoriaStore'
import { AgrupacionMayor } from '@/types/auditoria'

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
}

function AgrupacionItem({
  agrupacion,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onDragStart,
  onDragOver,
  onDrop
}: AgrupacionItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
    onDragOver(e)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false)
    onDrop(e)
  }

  const saldoColor = (agrupacion.saldo || 0) >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div
      className={`
        border rounded-lg mb-2 bg-white transition-all
        ${isSelected ? 'ring-2 ring-primary-500 border-primary-500' : 'border-gray-200'}
        ${isDragOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
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

      {/* Registros expandidos */}
      {isExpanded && agrupacion.registros && agrupacion.registros.length > 0 && (
        <div className="border-t bg-gray-50 max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Fecha</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Descripcion</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Debe</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Haber</th>
              </tr>
            </thead>
            <tbody>
              {agrupacion.registros.slice(0, 50).map((registro, idx) => (
                <tr key={registro.id || idx} className="border-b border-gray-100 hover:bg-white">
                  <td className="px-3 py-2 text-gray-600">
                    {registro.fecha ? new Date(registro.fecha).toLocaleDateString('es-AR') : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-800 truncate max-w-xs">
                    {registro.descripcion || registro.concepto || '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-green-600">
                    {registro.debe ? formatearMoneda(registro.debe) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-red-600">
                    {registro.haber ? formatearMoneda(registro.haber) : '-'}
                  </td>
                </tr>
              ))}
              {agrupacion.registros.length > 50 && (
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-center text-gray-500 italic">
                    ... y {agrupacion.registros.length - 50} registros mas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function AgrupacionesList() {
  const parentRef = useRef<HTMLDivElement>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const {
    agrupaciones,
    agrupacionSeleccionada,
    setAgrupacionSeleccionada,
    fusionarAgrupaciones
  } = useAuditoriaStore()

  // Virtualizer para lista larga
  const virtualizer = useVirtualizer({
    count: agrupaciones.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Altura estimada de cada item
    overscan: 5,
  })

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
    setDraggedId(agrupacion.id || null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetAgrupacion: AgrupacionMayor) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('agrupacionId')

    if (sourceId && sourceId !== targetAgrupacion.id) {
      fusionarAgrupaciones(targetAgrupacion.id!, sourceId)
    }

    setDraggedId(null)
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
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const agrupacion = agrupaciones[virtualItem.index]
          return (
            <div
              key={agrupacion.id || virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <AgrupacionItem
                agrupacion={agrupacion}
                isSelected={agrupacionSeleccionada === agrupacion.id}
                isExpanded={expandedIds.has(agrupacion.id || '')}
                onSelect={() => setAgrupacionSeleccionada(agrupacion.id || null)}
                onToggleExpand={() => toggleExpand(agrupacion.id || '')}
                onDragStart={(e) => handleDragStart(e, agrupacion)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, agrupacion)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
