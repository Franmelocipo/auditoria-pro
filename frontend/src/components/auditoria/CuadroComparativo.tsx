'use client'

import { useState, useMemo } from 'react'
import { Download, ChevronUp, ChevronDown, Edit2, Check, X, MessageSquare, AlertTriangle, Link2, Unlink } from 'lucide-react'
import { useAuditoriaStore } from '@/stores/auditoriaStore'
import { FilaCuadroComparativo, SaldoRazonSocial } from '@/types/auditoria'

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

type SortField = 'razonSocial' | 'saldoInicio' | 'debe' | 'haber' | 'saldoCalculado' | 'ajusteAuditoria' | 'saldoReportado' | 'diferencia' | 'estado'
type SortDirection = 'asc' | 'desc'

export function CuadroComparativo() {
  const [filtros, setFiltros] = useState<FiltrosState>({
    razonSocial: '',
    estado: 'todos',
    soloDiferencias: false,
  })
  const [sortField, setSortField] = useState<SortField>('razonSocial')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [editandoAjuste, setEditandoAjuste] = useState<string | null>(null)
  const [ajusteTemp, setAjusteTemp] = useState<number>(0)
  const [notaTemp, setNotaTemp] = useState<string>('')
  const [mostrarSaldosSinAsignar, setMostrarSaldosSinAsignar] = useState(false)
  const [reasignando, setReasignando] = useState<{tipo: 'inicio' | 'cierre', saldo: SaldoRazonSocial} | null>(null)
  const [busquedaReasignar, setBusquedaReasignar] = useState('')

  const {
    getCuadroComparativo,
    getTotalesCuadro,
    setAjusteAuditoria,
    saldosInicio,
    saldosCierre,
    agrupaciones,
    reasignarSaldo,
  } = useAuditoriaStore()

  const cuadro = getCuadroComparativo()
  const totales = getTotalesCuadro()

  // Normalizar para comparación
  const normalizarRS = (rs: string) => rs.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

  // Encontrar saldos sin asignar
  const saldosSinAsignar = useMemo(() => {
    const razonesEnCuadro = new Set(cuadro.map(f => normalizarRS(f.razonSocial)))

    const inicioSinAsignar = saldosInicio.filter(s => {
      const normalizado = normalizarRS(s.razonSocial)
      return !razonesEnCuadro.has(normalizado) &&
             !cuadro.some(f => normalizarRS(f.razonSocial).includes(normalizado) || normalizado.includes(normalizarRS(f.razonSocial)))
    })

    const cierreSinAsignar = saldosCierre.filter(s => {
      const normalizado = normalizarRS(s.razonSocial)
      return !razonesEnCuadro.has(normalizado) &&
             !cuadro.some(f => normalizarRS(f.razonSocial).includes(normalizado) || normalizado.includes(normalizarRS(f.razonSocial)))
    })

    return { inicio: inicioSinAsignar, cierre: cierreSinAsignar }
  }, [cuadro, saldosInicio, saldosCierre])

  // Ordenar y filtrar filas
  const filasFiltradas = useMemo(() => {
    let resultado = cuadro.filter(fila => {
      if (filtros.razonSocial) {
        const filtroLower = filtros.razonSocial.toLowerCase()
        if (!fila.razonSocial.toLowerCase().includes(filtroLower)) {
          return false
        }
      }
      if (filtros.estado !== 'todos' && fila.estado !== filtros.estado) {
        return false
      }
      if (filtros.soloDiferencias && Math.abs(fila.diferencia) < 0.01) {
        return false
      }
      return true
    })

    // Ordenar
    resultado.sort((a, b) => {
      let valorA: any = a[sortField]
      let valorB: any = b[sortField]

      if (typeof valorA === 'string') {
        valorA = valorA.toLowerCase()
        valorB = valorB.toLowerCase()
      }

      if (valorA < valorB) return sortDirection === 'asc' ? -1 : 1
      if (valorA > valorB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return resultado
  }, [cuadro, filtros, sortField, sortDirection])

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="w-4 h-4" />
    return sortDirection === 'asc'
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />
  }

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

  const handleReasignar = (razonSocialDestino: string) => {
    if (reasignando) {
      reasignarSaldo(reasignando.tipo, reasignando.saldo.razonSocial, razonSocialDestino)
      setReasignando(null)
      setBusquedaReasignar('')
    }
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

  const HeaderCell = ({ field, label, align = 'right', className = '' }: { field: SortField, label: string, align?: 'left' | 'right' | 'center', className?: string }) => (
    <th
      className={`px-4 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        <span>{label}</span>
        <SortIcon field={field} />
      </div>
    </th>
  )

  if (cuadro.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
        <p>Cargue un mayor contable para ver el cuadro comparativo</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Alerta de saldos sin asignar */}
      {(saldosSinAsignar.inicio.length > 0 || saldosSinAsignar.cierre.length > 0) && (
        <div
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:bg-yellow-100"
          onClick={() => setMostrarSaldosSinAsignar(!mostrarSaldosSinAsignar)}
        >
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              Hay saldos sin asignar: {saldosSinAsignar.inicio.length} de inicio, {saldosSinAsignar.cierre.length} de cierre
            </span>
            <span className="text-sm">(click para {mostrarSaldosSinAsignar ? 'ocultar' : 'ver'})</span>
          </div>
        </div>
      )}

      {/* Panel de saldos sin asignar */}
      {mostrarSaldosSinAsignar && (saldosSinAsignar.inicio.length > 0 || saldosSinAsignar.cierre.length > 0) && (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Saldos sin asignar</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Saldos inicio sin asignar */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Saldos de Inicio ({saldosSinAsignar.inicio.length})</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {saldosSinAsignar.inicio.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span className="truncate flex-1" title={s.razonSocial}>{s.razonSocial}</span>
                    <span className="text-gray-600 mx-2">{formatearMoneda(s.saldo)}</span>
                    <button
                      onClick={() => setReasignando({ tipo: 'inicio', saldo: s })}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Asignar a razón social"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {saldosSinAsignar.inicio.length === 0 && (
                  <p className="text-gray-400 text-sm">Todos asignados</p>
                )}
              </div>
            </div>

            {/* Saldos cierre sin asignar */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Saldos de Cierre ({saldosSinAsignar.cierre.length})</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {saldosSinAsignar.cierre.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span className="truncate flex-1" title={s.razonSocial}>{s.razonSocial}</span>
                    <span className="text-gray-600 mx-2">{formatearMoneda(s.saldo)}</span>
                    <button
                      onClick={() => setReasignando({ tipo: 'cierre', saldo: s })}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Asignar a razón social"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {saldosSinAsignar.cierre.length === 0 && (
                  <p className="text-gray-400 text-sm">Todos asignados</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de reasignación */}
      {reasignando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <h3 className="font-medium text-lg mb-4">
              Asignar saldo de {reasignando.tipo} a razón social
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              <strong>{reasignando.saldo.razonSocial}</strong>: {formatearMoneda(reasignando.saldo.saldo)}
            </p>
            <input
              type="text"
              placeholder="Buscar razón social destino..."
              value={busquedaReasignar}
              onChange={(e) => setBusquedaReasignar(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
              autoFocus
            />
            <div className="flex-1 overflow-y-auto space-y-1 mb-4">
              {agrupaciones
                .filter(a =>
                  busquedaReasignar === '' ||
                  a.razonSocial.toLowerCase().includes(busquedaReasignar.toLowerCase())
                )
                .slice(0, 20)
                .map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleReasignar(a.razonSocial)}
                    className="w-full text-left p-2 hover:bg-blue-50 rounded text-sm"
                  >
                    {a.razonSocial}
                  </button>
                ))
              }
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setReasignando(null); setBusquedaReasignar('') }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Filtrar por razon social..."
                value={filtros.razonSocial}
                onChange={(e) => setFiltros(f => ({ ...f, razonSocial: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
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
                <HeaderCell field="razonSocial" label="Razon Social" align="left" />
                <HeaderCell field="saldoInicio" label="Saldo Inicio" />
                <HeaderCell field="debe" label="Debe" />
                <HeaderCell field="haber" label="Haber" />
                <HeaderCell field="saldoCalculado" label="Saldo Calc." className="bg-blue-50" />
                <HeaderCell field="ajusteAuditoria" label="Ajuste Aud." />
                <HeaderCell field="saldoReportado" label="Saldo Report." />
                <HeaderCell field="diferencia" label="Diferencia" />
                <HeaderCell field="estado" label="Estado" align="center" />
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-20">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filasFiltradas.map((fila) => (
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
