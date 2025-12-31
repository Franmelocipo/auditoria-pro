'use client'

import { FileSpreadsheet, Users, AlertCircle, DollarSign } from 'lucide-react'
import { useAuditoriaStore } from '@/stores/auditoriaStore'

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(valor)
}

export function Estadisticas() {
  const { estadisticas, totales, agrupaciones, sinAsignar } = useAuditoriaStore()

  const stats = [
    {
      label: 'Total Registros',
      value: estadisticas?.total_registros || 0,
      icon: FileSpreadsheet,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      label: 'Agrupaciones',
      value: agrupaciones.length,
      icon: Users,
      color: 'bg-green-100 text-green-600'
    },
    {
      label: 'Sin Asignar',
      value: sinAsignar.length,
      icon: AlertCircle,
      color: 'bg-yellow-100 text-yellow-600'
    },
  ]

  return (
    <div className="bg-white rounded-lg border p-4">
      {/* Todo en una fila horizontal */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Estadisticas */}
        <div className="flex flex-wrap items-center gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {stat.value.toLocaleString('es-AR')}
                </p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Separador vertical */}
        <div className="hidden lg:block h-12 w-px bg-gray-200"></div>

        {/* Totales en linea */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 uppercase">Totales:</span>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600">
              {formatearMoneda(totales.debe)}
            </p>
            <p className="text-xs text-gray-500">Debe</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600">
              {formatearMoneda(totales.haber)}
            </p>
            <p className="text-xs text-gray-500">Haber</p>
          </div>
          <div className="text-center px-3 py-1 rounded-lg bg-gray-100">
            <p className={`text-lg font-bold ${totales.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatearMoneda(totales.saldo)}
            </p>
            <p className="text-xs text-gray-500">Saldo</p>
          </div>
        </div>
      </div>
    </div>
  )
}
