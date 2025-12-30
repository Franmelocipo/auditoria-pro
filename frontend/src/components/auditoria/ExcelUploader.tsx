'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuditoriaStore } from '@/stores/auditoriaStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  message: string
}

export function ExcelUploader() {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  })

  const {
    setRegistros,
    setAgrupaciones,
    setSinAsignar,
    setTotales,
    setEstadisticas,
    setLoading,
    setError
  } = useAuditoriaStore()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploadState({ status: 'uploading', progress: 0, message: 'Subiendo archivo...' })
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('archivo', file)

      setUploadState({ status: 'processing', progress: 50, message: 'Procesando y agrupando...' })

      const response = await fetch(`${API_URL}/api/auditoria/procesar-excel?agrupar=true`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error al procesar el archivo')
      }

      const data = await response.json()

      setUploadState({ status: 'success', progress: 100, message: 'Procesado correctamente' })

      // Actualizar store
      setRegistros(data.registros || [])
      setAgrupaciones(data.agrupaciones || [])
      setSinAsignar(data.sin_asignar || [])
      setTotales(data.totales || { debe: 0, haber: 0, saldo: 0 })
      setEstadisticas(data.estadisticas || null)

      // Resetear estado despues de 2 segundos
      setTimeout(() => {
        setUploadState({ status: 'idle', progress: 0, message: '' })
      }, 2000)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setUploadState({ status: 'error', progress: 0, message })
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [setRegistros, setAgrupaciones, setSinAsignar, setTotales, setEstadisticas, setLoading, setError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: uploadState.status === 'uploading' || uploadState.status === 'processing'
  })

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />
      case 'error':
        return <AlertCircle className="w-12 h-12 text-red-500" />
      default:
        return isDragActive ? (
          <Upload className="w-12 h-12 text-primary-500" />
        ) : (
          <FileSpreadsheet className="w-12 h-12 text-gray-400" />
        )
    }
  }

  const getMessage = () => {
    if (uploadState.status !== 'idle') {
      return uploadState.message
    }
    if (isDragActive) {
      return 'Suelta el archivo aqui...'
    }
    return 'Arrastra un archivo Excel o haz clic para seleccionar'
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}
        ${uploadState.status === 'error' ? 'border-red-300 bg-red-50' : ''}
        ${uploadState.status === 'success' ? 'border-green-300 bg-green-50' : ''}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4">
        {getStatusIcon()}

        <div>
          <p className="text-gray-600 font-medium">{getMessage()}</p>
          <p className="text-sm text-gray-400 mt-1">
            Formatos soportados: .xlsx, .xls
          </p>
        </div>

        {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
          <div className="w-full max-w-xs">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
