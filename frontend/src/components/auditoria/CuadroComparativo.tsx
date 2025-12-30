'use client'

import { useState, useMemo } from 'react'
import { Download, Filter, Edit2, Check, X, MessageSquare } from 'lucide-react'
import { useAuditoriaStore } from '@/stores/auditoriaStore'
import { FilaCuadroComparativo } from '@/types/auditoria'

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(valor)
}

interface FiltrosState {
  razonSocial: string
  estado: 'todos' | 'ok' | 'diferencia' | 'sin_cierre'
  soloDiferencias: boolean
}

export function CuadroComparativo() {
  const [filtros, setFiltros] = useState<FiltrosState>({
    razonSocial: '',
    estado: 'todos',
    soloDiferencias: false,
  })
  const [editandoAjuste, setEditandoAjuste] = useState<string | null>(null)
  const [ajusteTemp, setAjusteTemp] = useState<number>(0)
  const [notaTemp, setNotaTemp] = useState<string>('')

  const {
    getCuadroComparativo,
    getTotalesCuadro,
    setAjusteAuditoria,
    saldosInicio,
    saldosCierre,
  } = useAuditoriaStore()

  const cuadro = getCuadroComparativo()
  const totales = getTotalesCuadro()

  // Filtrar filas
  const filasFiltradas = useMemo(() => {
    return cuadro.filter(fila => {
      // Filtro por razón social
      if (filtros.razonSocial) {
        const filtroLower = filtros.razonSocial.toLowerCase()
        if (!fila.razonSocial.toLowerCase().includes(filtroLower)) {
          return false
        }
      }

      // Filtro por estado
      if (filtros.estado !== 'todos' && fila.estado !== filtros.estado) {
        return false
      }

      // Filtro solo diferencias
      if (filtros.soloDiferencias && Math.abs(fila.diferencia) < 0.01) {
        return false
      }

      return true
    })
  }, [cuadro, filtros])

  // Totales filtrados
  const totalesFiltrados = useMemo(() => {
    return filasFiltradas.reduce((acc, fila) => ({
      saldoInicio: acc.saldoInicio + fila.saldoInicio,
      debe: acc.debe + fila.debe,
      haber: acc.haber + fila.haber,
      saldoCalculado: acc.saldoCalculado + fila.saldoCalculado,
      ajusteAuditoria: acc.ajusteAuditoria + fila.ajusteAuditoria,
      saldoReportado: acc.saldoReportado + fila.saldoReportado,
      diferencia: acc.diferencia + fila.diferencia,
    }), {
      saldoInicio: 0,
      debe: 0,
      haber: 0,
      saldoCalculado: 0,
      ajusteAuditoria: 0,
      saldoReportado: 0,
      diferencia: 0,
    })
  }, [filasFiltradas])

  const handleEditarAjuste = (fila: FilaCuadroComparativo) => {
    setEditandoAjuste(fila.razonSocial)
    setAjusteTemp(fila.ajusteAuditoria)
    setNotaTemp(fila.notaAjuste || '')
  }

  const handleGuardarAjuste = () => {
    if (editandoAjuste) {
      setAjusteAuditoria(editandoAjuste, ajusteTemp, notaTemp)
      setEditandoAjuste(null)
    }
  }

  const handleCancelarAjuste = () => {
    setEditandoAjuste(null)
    setAjusteTemp(0)
    setNotaTemp('')
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'ok':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">OK</span>
      case 'diferencia':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Diferencia</span>
      case 'sin_cierre':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Sin cierre</span>
      default:
        return null
    }
  }

  if (cuadro.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
        <p>Cargue un mayor contable para ver el cuadro comparativo</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen de totales */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Saldos Inicio</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatearMoneda(totales.saldoInicio)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">+ Movimientos (D-H)</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatearMoneda(totales.debe - totales.haber)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">= Saldo Calculado</p>
          <p className="text-lg font-semibold text-blue-600">
            {formatearMoneda(totales.saldoCalculado)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Saldo Reportado</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatearMoneda(totales.saldoReportado)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Diferencia</p>
          <p className={`text-lg font-semibold ${Math.abs(totales.diferencia) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
            {formatearMoneda(totales.diferencia)}
          </p>
        </div>
      </div>

      {/* Filtros y acciones */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Filtro por razón social */}
            <div className="flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Filtrar por razon social..."
                value={filtros.razonSocial}
                onChange={(e) => setFiltros(f => ({ ...f, razonSocial: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* Filtro por estado */}
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros(f => ({ ...f, estado: e.target.value as FiltrosState['estado'] }))}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="todos">Todos los estados</option>
              <option value="ok">Solo OK</option>
              <option value="diferencia">Solo con diferencia</option>
              <option value="sin_cierre">Sin saldo cierre</option>
            </select>

            {/* Solo diferencias */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.soloDiferencias}
                onChange={(e) => setFiltros(f => ({ ...f, soloDiferencias: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Mostrar solo diferencias
            </label>
          </div>

          {/* Exportar */}
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Razon Social</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Saldo Inicio</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Debe</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Haber</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 bg-blue-50">Saldo Calc.</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Ajuste Aud.</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Saldo Report.</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Diferencia</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Estado</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-20">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filasFiltradas.map((fila, idx) => (
                <tr key={fila.razonSocial} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate" title={fila.razonSocial}>
                    {fila.razonSocial}
                    {fila.notaAjuste && (
                      <span className="ml-2 text-blue-500" title={fila.notaAjuste}>
                        <MessageSquare className="w-3 h-3 inline" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatearMoneda(fila.saldoInicio)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatearMoneda(fila.debe)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {formatearMoneda(fila.haber)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600 bg-blue-50">
                    {formatearMoneda(fila.saldoCalculado)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editandoAjuste === fila.razonSocial ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          value={ajusteTemp}
                          onChange={(e) => setAjusteTemp(parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border rounded text-right text-xs"
                          step="0.01"
                        />
                        <input
                          type="text"
                          placeholder="Nota..."
                          value={notaTemp}
                          onChange={(e) => setNotaTemp(e.target.value)}
                          className="w-24 px-2 py-1 border rounded text-xs"
                        />
                      </div>
                    ) : (
                      <span className={fila.ajusteAuditoria !== 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                        {formatearMoneda(fila.ajusteAuditoria)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatearMoneda(fila.saldoReportado)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${
                    Math.abs(fila.diferencia) > 0.01 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatearMoneda(fila.diferencia)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getEstadoBadge(fila.estado)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editandoAjuste === fila.razonSocial ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={handleGuardarAjuste}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelarAjuste}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditarAjuste(fila)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Agregar ajuste"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totales */}
            <tfoot className="bg-gray-100 border-t-2 font-medium">
              <tr>
                <td className="px-4 py-3 text-gray-700">TOTALES</td>
                <td className="px-4 py-3 text-right">{formatearMoneda(totalesFiltrados.saldoInicio)}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatearMoneda(totalesFiltrados.debe)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatearMoneda(totalesFiltrados.haber)}</td>
                <td className="px-4 py-3 text-right text-blue-600 bg-blue-50">{formatearMoneda(totalesFiltrados.saldoCalculado)}</td>
                <td className="px-4 py-3 text-right text-orange-600">{formatearMoneda(totalesFiltrados.ajusteAuditoria)}</td>
                <td className="px-4 py-3 text-right">{formatearMoneda(totalesFiltrados.saldoReportado)}</td>
                <td className={`px-4 py-3 text-right ${Math.abs(totalesFiltrados.diferencia) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatearMoneda(totalesFiltrados.diferencia)}
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Info de datos cargados */}
      <div className="text-sm text-gray-500 flex items-center gap-4">
        <span>Saldos inicio: {saldosInicio.length > 0 ? `${saldosInicio.length} cargados` : 'No cargado'}</span>
        <span>|</span>
        <span>Saldos cierre: {saldosCierre.length > 0 ? `${saldosCierre.length} cargados` : 'No cargado'}</span>
        <span>|</span>
        <span>Mostrando {filasFiltradas.length} de {cuadro.length} razones sociales</span>
      </div>
    </div>
  )
}
