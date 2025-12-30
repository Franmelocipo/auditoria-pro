'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, Calculator, CheckCircle, AlertCircle } from 'lucide-react'

interface HealthStatus {
  api: 'loading' | 'healthy' | 'error'
  db: 'loading' | 'healthy' | 'error'
}

export default function Home() {
  const [health, setHealth] = useState<HealthStatus>({ api: 'loading', db: 'loading' })

  useEffect(() => {
    checkHealth()
  }, [])

  const checkHealth = async () => {
    try {
      // Check API health
      const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      if (apiRes.ok) {
        setHealth(prev => ({ ...prev, api: 'healthy' }))
      } else {
        setHealth(prev => ({ ...prev, api: 'error' }))
      }

      // Check DB health
      const dbRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health/db`)
      const dbData = await dbRes.json()
      setHealth(prev => ({
        ...prev,
        db: dbData.status === 'healthy' ? 'healthy' :
            dbData.status === 'not_configured' ? 'loading' : 'error'
      }))
    } catch (error) {
      setHealth({ api: 'error', db: 'error' })
    }
  }

  const StatusIcon = ({ status }: { status: 'loading' | 'healthy' | 'error' }) => {
    if (status === 'loading') return <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse" />
    if (status === 'healthy') return <CheckCircle className="w-4 h-4 text-green-500" />
    return <AlertCircle className="w-4 h-4 text-red-500" />
  }

  const herramientas = [
    {
      titulo: 'Análisis de Mayores',
      descripcion: 'Analiza y agrupa registros de mayores contables por razón social',
      href: '/auditoria',
      icon: FileSpreadsheet,
    },
    {
      titulo: 'Conciliador Bancario',
      descripcion: 'Concilia extractos bancarios con registros contables',
      href: '/conciliador',
      icon: Calculator,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido a Auditoria Pro
        </h1>
        <p className="mt-2 text-gray-600">
          Herramientas profesionales para auditoría contable
        </p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <StatusIcon status={health.api} />
          <span className="text-sm text-gray-600">API</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={health.db} />
          <span className="text-sm text-gray-600">Base de datos</span>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {herramientas.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <tool.icon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {tool.titulo}
                </h2>
                <p className="mt-1 text-gray-600">
                  {tool.descripcion}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
