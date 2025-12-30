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
    <div className="space-y-4">
      {/* Cards de estadisticas */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value.toLocaleString('es-AR')}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Totales
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-green-600">
              {formatearMoneda(totales.debe)}
            </p>
            <p className="text-sm text-gray-500">Total Debe</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-600">
              {formatearMoneda(totales.haber)}
            </p>
            <p className="text-sm text-gray-500">Total Haber</p>
          </div>
          <div>
            <p className={`text-lg font-semibold ${totales.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatearMoneda(totales.saldo)}
            </p>
            <p className="text-sm text-gray-500">Saldo</p>
          </div>
        </div>
      </div>
    </div>
  )
}
