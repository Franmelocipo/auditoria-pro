import { create } from 'zustand'
import { RegistroMayor, AgrupacionMayor, Conciliacion } from '@/types/auditoria'

interface Totales {
  debe: number
  haber: number
  saldo: number
}

interface Estadisticas {
  total_registros: number
  total_agrupaciones: number
  registros_asignados: number
  registros_sin_asignar: number
}

interface AuditoriaState {
  // Datos
  registros: RegistroMayor[]
  agrupaciones: AgrupacionMayor[]
  sinAsignar: RegistroMayor[]
  totales: Totales
  estadisticas: Estadisticas | null

  // UI State
  loading: boolean
  error: string | null
  conciliacionActual: Conciliacion | null
  agrupacionSeleccionada: string | null

  // Actions
  setRegistros: (registros: RegistroMayor[]) => void
  setAgrupaciones: (agrupaciones: AgrupacionMayor[]) => void
  setSinAsignar: (sinAsignar: RegistroMayor[]) => void
  setTotales: (totales: Totales) => void
  setEstadisticas: (estadisticas: Estadisticas) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setConciliacionActual: (conciliacion: Conciliacion | null) => void
  setAgrupacionSeleccionada: (id: string | null) => void

  // Operaciones
  fusionarAgrupaciones: (destinoId: string, origenId: string) => void
  moverASinAsignar: (agrupacionId: string, registroId: string) => void
  moverAAgrupacion: (registroId: string, agrupacionId: string) => void
  limpiar: () => void
}

const initialTotales: Totales = { debe: 0, haber: 0, saldo: 0 }

export const useAuditoriaStore = create<AuditoriaState>((set, get) => ({
  // Estado inicial
  registros: [],
  agrupaciones: [],
  sinAsignar: [],
  totales: initialTotales,
  estadisticas: null,
  loading: false,
  error: null,
  conciliacionActual: null,
  agrupacionSeleccionada: null,

  // Setters
  setRegistros: (registros) => set({ registros }),
  setAgrupaciones: (agrupaciones) => set({ agrupaciones }),
  setSinAsignar: (sinAsignar) => set({ sinAsignar }),
  setTotales: (totales) => set({ totales }),
  setEstadisticas: (estadisticas) => set({ estadisticas }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setConciliacionActual: (conciliacion) => set({ conciliacionActual: conciliacion }),
  setAgrupacionSeleccionada: (id) => set({ agrupacionSeleccionada: id }),

  // Fusionar dos agrupaciones
  fusionarAgrupaciones: (destinoId, origenId) => {
    const { agrupaciones } = get()

    const destino = agrupaciones.find(a => a.id === destinoId)
    const origen = agrupaciones.find(a => a.id === origenId)

    if (!destino || !origen) return

    // Combinar registros
    const registrosCombinados = [...(destino.registros || []), ...(origen.registros || [])]

    // Calcular nuevos totales
    const totalDebe = registrosCombinados.reduce((sum, r) => sum + (r.debe || 0), 0)
    const totalHaber = registrosCombinados.reduce((sum, r) => sum + (r.haber || 0), 0)

    // Actualizar destino
    const nuevasAgrupaciones = agrupaciones.map(a => {
      if (a.id === destinoId) {
        return {
          ...a,
          registros: registrosCombinados,
          cantidad: registrosCombinados.length,
          totalDebe,
          totalHaber,
          saldo: totalDebe - totalHaber,
        }
      }
      return a
    }).filter(a => a.id !== origenId) // Eliminar origen

    set({ agrupaciones: nuevasAgrupaciones })
  },

  // Mover registro a sin asignar
  moverASinAsignar: (agrupacionId, registroId) => {
    const { agrupaciones, sinAsignar } = get()

    let registroMovido: RegistroMayor | null = null

    const nuevasAgrupaciones = agrupaciones.map(a => {
      if (a.id === agrupacionId) {
        const registro = a.registros?.find(r => r.id === registroId)
        if (registro) {
          registroMovido = registro
          const nuevosRegistros = a.registros?.filter(r => r.id !== registroId) || []
          const totalDebe = nuevosRegistros.reduce((sum, r) => sum + (r.debe || 0), 0)
          const totalHaber = nuevosRegistros.reduce((sum, r) => sum + (r.haber || 0), 0)
          return {
            ...a,
            registros: nuevosRegistros,
            cantidad: nuevosRegistros.length,
            totalDebe,
            totalHaber,
            saldo: totalDebe - totalHaber,
          }
        }
      }
      return a
    }).filter(a => (a.registros?.length || 0) > 0) // Eliminar agrupaciones vacías

    if (registroMovido) {
      set({
        agrupaciones: nuevasAgrupaciones,
        sinAsignar: [...sinAsignar, registroMovido]
      })
    }
  },

  // Mover registro de sin asignar a una agrupacion
  moverAAgrupacion: (registroId, agrupacionId) => {
    const { agrupaciones, sinAsignar } = get()

    const registro = sinAsignar.find(r => r.id === registroId)
    if (!registro) return

    const nuevasAgrupaciones = agrupaciones.map(a => {
      if (a.id === agrupacionId) {
        const nuevosRegistros = [...(a.registros || []), registro]
        const totalDebe = nuevosRegistros.reduce((sum, r) => sum + (r.debe || 0), 0)
        const totalHaber = nuevosRegistros.reduce((sum, r) => sum + (r.haber || 0), 0)
        return {
          ...a,
          registros: nuevosRegistros,
          cantidad: nuevosRegistros.length,
          totalDebe,
          totalHaber,
          saldo: totalDebe - totalHaber,
        }
      }
      return a
    })

    set({
      agrupaciones: nuevasAgrupaciones,
      sinAsignar: sinAsignar.filter(r => r.id !== registroId)
    })
  },

  // Limpiar todo
  limpiar: () => set({
    registros: [],
    agrupaciones: [],
    sinAsignar: [],
    totales: initialTotales,
    estadisticas: null,
    error: null,
    conciliacionActual: null,
    agrupacionSeleccionada: null,
  }),
}))
