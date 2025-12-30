'use client'

import { useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertCircle, GripVertical } from 'lucide-react'
import { useAuditoriaStore } from '@/stores/auditoriaStore'
import { RegistroMayor } from '@/types/auditoria'

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(valor)
}

export function SinAsignar() {
  const parentRef = useRef<HTMLDivElement>(null)
  const { sinAsignar, agrupaciones, moverAAgrupacion } = useAuditoriaStore()
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const virtualizer = useVirtualizer({
    count: sinAsignar.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  })

  const handleDragStart = (e: React.DragEvent, registro: RegistroMayor) => {
    e.dataTransfer.setData('registroId', registro.id || '')
    e.dataTransfer.setData('type', 'registro')
    setDraggedId(registro.id || null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
  }

  if (sinAsignar.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6 text-center text-gray-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>No hay registros sin asignar</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-3 border-b bg-yellow-50">
        <h3 className="font-medium text-yellow-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Registros Sin Asignar ({sinAsignar.length})
        </h3>
        <p className="text-sm text-yellow-600 mt-1">
          Arrastra estos registros hacia una agrupacion
        </p>
      </div>

      <div
        ref={parentRef}
        className="h-[300px] overflow-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const registro = sinAsignar[virtualItem.index]
            const isDragging = draggedId === registro.id

            return (
              <div
                key={registro.id || virtualItem.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div
                  className={`
                    flex items-center gap-3 p-3 border-b hover:bg-gray-50 cursor-grab
                    ${isDragging ? 'opacity-50 bg-gray-100' : ''}
                  `}
                  draggable
                  onDragStart={(e) => handleDragStart(e, registro)}
                  onDragEnd={handleDragEnd}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {registro.descripcion || registro.concepto || 'Sin descripcion'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {registro.fecha ? new Date(registro.fecha).toLocaleDateString('es-AR') : '-'}
                    </p>
                  </div>

                  <div className="text-right text-sm flex-shrink-0">
                    {registro.debe ? (
                      <span className="text-green-600">{formatearMoneda(registro.debe)}</span>
                    ) : registro.haber ? (
                      <span className="text-red-600">{formatearMoneda(registro.haber)}</span>
                    ) : '-'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
