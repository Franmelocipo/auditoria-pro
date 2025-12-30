'use client'

import { useState, useRef } from 'react'
import { Upload, X, Check, FileSpreadsheet } from 'lucide-react'
import { useAuditoriaStore } from '@/stores/auditoriaStore'
import { SaldoRazonSocial } from '@/types/auditoria'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SaldosUploaderProps {
  tipo: 'inicio' | 'cierre'
}

export function SaldosUploader({ tipo }: SaldosUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    saldosInicio,
    saldosCierre,
    setSaldosInicio,
    setSaldosCierre,
    limpiarSaldosInicio,
    limpiarSaldosCierre,
    mayorIncluyeApertura,
    setMayorIncluyeApertura,
  } = useAuditoriaStore()

  const saldos = tipo === 'inicio' ? saldosInicio : saldosCierre
  const setSaldos = tipo === 'inicio' ? setSaldosInicio : setSaldosCierre
  const limpiarSaldos = tipo === 'inicio' ? limpiarSaldosInicio : limpiarSaldosCierre

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Usar endpoint del backend para procesar saldos
      const response = await fetch(`${API_URL}/api/auditoria/procesar-saldos`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al procesar archivo')
      }

      const data = await response.json()
      const saldosProcesados: SaldoRazonSocial[] = data.saldos || []

      setSaldos(saldosProcesados)

    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Error al procesar archivo')
    } finally {
      setLoading(false)
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleLimpiar = () => {
    limpiarSaldos()
    setError(null)
  }

  const totalSaldo = saldos.reduce((sum, s) => sum + s.saldo, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Saldos al {tipo === 'inicio' ? 'Inicio' : 'Cierre'}:
        </label>
        {saldos.length > 0 ? (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" />
            {saldos.length} cargados
          </span>
        ) : (
          <span className="text-sm text-gray-400">No cargado</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          id={`saldos-${tipo}`}
        />

        <label
          htmlFor={`saldos-${tipo}`}
          className={`
            flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer
            text-sm transition-colors
            ${loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'hover:bg-gray-50 text-gray-700 border-gray-300'
            }
          `}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Cargar archivo
            </>
          )}
        </label>

        {saldos.length > 0 && (
          <button
            onClick={handleLimpiar}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Limpiar saldos"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Checkbox solo para saldos de inicio */}
      {tipo === 'inicio' && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={mayorIncluyeApertura}
            onChange={(e) => setMayorIncluyeApertura(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          El mayor incluye asiento de apertura
        </label>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Resumen si hay saldos */}
      {saldos.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total:</span>
            <span className={`font-medium ${totalSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS'
              }).format(totalSaldo)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
