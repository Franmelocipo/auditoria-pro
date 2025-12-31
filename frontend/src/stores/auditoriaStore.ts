import { create } from 'zustand'
import { RegistroMayor, AgrupacionMayor, Conciliacion, SaldoRazonSocial, FilaCuadroComparativo } from '@/types/auditoria'

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

interface TotalesCuadro {
  saldoInicio: number
  debe: number
  haber: number
  saldoCalculado: number
  ajusteAuditoria: number
  saldoReportado: number
  diferencia: number
}

interface AuditoriaState {
  // Datos principales
  registros: RegistroMayor[]
  agrupaciones: AgrupacionMayor[]
  sinAsignar: RegistroMayor[]
  totales: Totales
  estadisticas: Estadisticas | null

  // Saldos de inicio y cierre
  saldosInicio: SaldoRazonSocial[]
  saldosCierre: SaldoRazonSocial[]
  mayorIncluyeApertura: boolean

  // UI State
  loading: boolean
  error: string | null
  conciliacionActual: Conciliacion | null
  agrupacionSeleccionada: string | null
  tabActiva: 'agrupaciones' | 'cuadro'

  // Actions - Datos
  setRegistros: (registros: RegistroMayor[]) => void
  setAgrupaciones: (agrupaciones: AgrupacionMayor[]) => void
  setSinAsignar: (sinAsignar: RegistroMayor[]) => void
  setTotales: (totales: Totales) => void
  setEstadisticas: (estadisticas: Estadisticas) => void
  recalcularTotalesAgrupaciones: () => void
  crearNuevaAgrupacion: (nombre: string) => void

  // Actions - Saldos
  setSaldosInicio: (saldos: SaldoRazonSocial[]) => void
  setSaldosCierre: (saldos: SaldoRazonSocial[]) => void
  setMayorIncluyeApertura: (incluye: boolean) => void
  limpiarSaldosInicio: () => void
  limpiarSaldosCierre: () => void

  // Actions - Ajustes
  setAjusteAuditoria: (razonSocial: string, ajuste: number, nota?: string) => void

  // Actions - UI
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setConciliacionActual: (conciliacion: Conciliacion | null) => void
  setAgrupacionSeleccionada: (id: string | null) => void
  setTabActiva: (tab: 'agrupaciones' | 'cuadro') => void

  // Operaciones
  fusionarAgrupaciones: (destinoId: string, origenId: string) => void
  moverASinAsignar: (agrupacionId: string, registroId: string) => void
  moverAAgrupacion: (registroId: string, agrupacionId: string) => void
  moverRegistrosASinAsignar: (agrupacionId: string, registroIds: string[]) => void
  moverRegistrosAOtraAgrupacion: (origenId: string, destinoId: string, registroIds: string[]) => void
  reasignarSaldo: (tipo: 'inicio' | 'cierre', razonSocialOrigen: string, razonSocialDestino: string) => void
  limpiar: () => void

  // Computed
  getCuadroComparativo: () => FilaCuadroComparativo[]
  getTotalesCuadro: () => TotalesCuadro
}

const initialTotales: Totales = { debe: 0, haber: 0, saldo: 0 }

// Función para recalcular totales desde agrupaciones y sin asignar
function calcularTotales(agrupaciones: AgrupacionMayor[], sinAsignar: RegistroMayor[]): Totales {
  let debe = 0
  let haber = 0

  agrupaciones.forEach(a => {
    debe += a.totalDebe || 0
    haber += a.totalHaber || 0
  })

  sinAsignar.forEach(r => {
    debe += r.debe || 0
    haber += r.haber || 0
  })

  return { debe, haber, saldo: debe - haber }
}

// Función para recalcular estadísticas
function calcularEstadisticas(
  registros: RegistroMayor[],
  agrupaciones: AgrupacionMayor[],
  sinAsignar: RegistroMayor[]
): Estadisticas {
  const registrosAsignados = agrupaciones.reduce((sum, a) => sum + (a.registros?.length || 0), 0)

  return {
    total_registros: registros.length,
    total_agrupaciones: agrupaciones.length,
    registros_asignados: registrosAsignados,
    registros_sin_asignar: sinAsignar.length
  }
}

// Normalizar razón social para comparación
function normalizarRazonSocial(rs: string): string {
  return rs
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const useAuditoriaStore = create<AuditoriaState>((set, get) => ({
  // Estado inicial
  registros: [],
  agrupaciones: [],
  sinAsignar: [],
  totales: initialTotales,
  estadisticas: null,
  saldosInicio: [],
  saldosCierre: [],
  mayorIncluyeApertura: false,
  loading: false,
  error: null,
  conciliacionActual: null,
  agrupacionSeleccionada: null,
  tabActiva: 'agrupaciones',

  // Setters básicos
  setRegistros: (registros) => set({ registros }),
  setAgrupaciones: (agrupaciones) => set({ agrupaciones }),
  setSinAsignar: (sinAsignar) => set({ sinAsignar }),
  setTotales: (totales) => set({ totales }),
  setEstadisticas: (estadisticas) => set({ estadisticas }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setConciliacionActual: (conciliacion) => set({ conciliacionActual: conciliacion }),
  setAgrupacionSeleccionada: (id) => set({ agrupacionSeleccionada: id }),
  setTabActiva: (tab) => set({ tabActiva: tab }),

  // Recalcular totales de agrupaciones basándose en registros
  recalcularTotalesAgrupaciones: () => {
    const { agrupaciones, sinAsignar, registros } = get()

    // Recalcular totalDebe y totalHaber de cada agrupación basándose en sus registros
    const agrupacionesRecalculadas = agrupaciones.map(a => {
      if (a.registros && a.registros.length > 0) {
        const totalDebe = a.registros.reduce((sum, r) => sum + (r.debe || 0), 0)
        const totalHaber = a.registros.reduce((sum, r) => sum + (r.haber || 0), 0)
        return {
          ...a,
          totalDebe,
          totalHaber,
          saldo: totalDebe - totalHaber,
          cantidad: a.registros.length,
        }
      }
      return a
    })

    const nuevosTotales = calcularTotales(agrupacionesRecalculadas, sinAsignar)
    const nuevasEstadisticas = calcularEstadisticas(registros, agrupacionesRecalculadas, sinAsignar)

    set({
      agrupaciones: agrupacionesRecalculadas,
      totales: nuevosTotales,
      estadisticas: nuevasEstadisticas,
    })
  },

  // Crear nueva agrupación vacía
  crearNuevaAgrupacion: (nombre) => {
    const { agrupaciones, sinAsignar, registros } = get()

    const nuevaAgrupacion: AgrupacionMayor = {
      id: `agrup-nuevo-${Date.now()}`,
      razonSocial: nombre,
      registros: [],
      cantidad: 0,
      totalDebe: 0,
      totalHaber: 0,
      saldo: 0,
      variantes: [nombre],
    }

    const nuevasAgrupaciones = [...agrupaciones, nuevaAgrupacion]
    const nuevasEstadisticas = calcularEstadisticas(registros, nuevasAgrupaciones, sinAsignar)

    set({
      agrupaciones: nuevasAgrupaciones,
      estadisticas: nuevasEstadisticas,
    })
  },

  // Setters de saldos
  setSaldosInicio: (saldos) => set({ saldosInicio: saldos }),
  setSaldosCierre: (saldos) => set({ saldosCierre: saldos }),
  setMayorIncluyeApertura: (incluye) => set({ mayorIncluyeApertura: incluye }),
  limpiarSaldosInicio: () => set({ saldosInicio: [] }),
  limpiarSaldosCierre: () => set({ saldosCierre: [] }),

  // Ajustes de auditoría
  setAjusteAuditoria: (razonSocial, ajuste, nota) => {
    const { agrupaciones } = get()
    const nuevasAgrupaciones = agrupaciones.map(a => {
      if (normalizarRazonSocial(a.razonSocial || '') === normalizarRazonSocial(razonSocial)) {
        return { ...a, ajusteAuditoria: ajuste, notaAjuste: nota }
      }
      return a
    })
    set({ agrupaciones: nuevasAgrupaciones })
  },

  // Fusionar dos agrupaciones
  fusionarAgrupaciones: (destinoId, origenId) => {
    const { agrupaciones, sinAsignar, registros } = get()

    const destino = agrupaciones.find(a => a.id === destinoId)
    const origen = agrupaciones.find(a => a.id === origenId)

    if (!destino || !origen) return

    const registrosCombinados = [...(destino.registros || []), ...(origen.registros || [])]

    const variantesCombinadas = [
      ...(destino.variantes || [destino.razonSocial || '']),
      ...(origen.variantes || [origen.razonSocial || ''])
    ].filter((v, i, arr) => v && arr.indexOf(v) === i)

    const totalDebe = registrosCombinados.reduce((sum, r) => sum + (r.debe || 0), 0)
    const totalHaber = registrosCombinados.reduce((sum, r) => sum + (r.haber || 0), 0)

    const nuevasAgrupaciones = agrupaciones.map(a => {
      if (a.id === destinoId) {
        return {
          ...a,
          registros: registrosCombinados,
          cantidad: registrosCombinados.length,
          totalDebe,
          totalHaber,
          saldo: totalDebe - totalHaber,
          variantes: variantesCombinadas,
          // Combinar saldos si existen
          saldoInicio: (destino.saldoInicio || 0) + (origen.saldoInicio || 0),
          saldoCierre: (destino.saldoCierre || 0) + (origen.saldoCierre || 0),
          ajusteAuditoria: (destino.ajusteAuditoria || 0) + (origen.ajusteAuditoria || 0),
        }
      }
      return a
    }).filter(a => a.id !== origenId)

    const nuevosTotales = calcularTotales(nuevasAgrupaciones, sinAsignar)
    const nuevasEstadisticas = calcularEstadisticas(registros, nuevasAgrupaciones, sinAsignar)

    set({
      agrupaciones: nuevasAgrupaciones,
      totales: nuevosTotales,
      estadisticas: nuevasEstadisticas
    })
  },

  // Mover registro a sin asignar
  moverASinAsignar: (agrupacionId, registroId) => {
    const { agrupaciones, sinAsignar, registros } = get()

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
    }).filter(a => (a.registros?.length || 0) > 0)

    if (registroMovido) {
      const nuevoSinAsignar = [...sinAsignar, registroMovido]
      const nuevosTotales = calcularTotales(nuevasAgrupaciones, nuevoSinAsignar)
      const nuevasEstadisticas = calcularEstadisticas(registros, nuevasAgrupaciones, nuevoSinAsignar)

      set({
        agrupaciones: nuevasAgrupaciones,
        sinAsignar: nuevoSinAsignar,
        totales: nuevosTotales,
        estadisticas: nuevasEstadisticas
      })
    }
  },

  // Mover registro de sin asignar a una agrupacion
  moverAAgrupacion: (registroId, agrupacionId) => {
    const { agrupaciones, sinAsignar, registros } = get()

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

    const nuevoSinAsignar = sinAsignar.filter(r => r.id !== registroId)
    const nuevosTotales = calcularTotales(nuevasAgrupaciones, nuevoSinAsignar)
    const nuevasEstadisticas = calcularEstadisticas(registros, nuevasAgrupaciones, nuevoSinAsignar)

    set({
      agrupaciones: nuevasAgrupaciones,
      sinAsignar: nuevoSinAsignar,
      totales: nuevosTotales,
      estadisticas: nuevasEstadisticas
    })
  },

  // Mover múltiples registros a sin asignar
  moverRegistrosASinAsignar: (agrupacionId, registroIds) => {
    const { agrupaciones, sinAsignar, registros } = get()

    const registroIdsSet = new Set(registroIds)
    const registrosMovidos: RegistroMayor[] = []

    const nuevasAgrupaciones = agrupaciones.map(a => {
      if (a.id === agrupacionId) {
        const registrosAMover = a.registros?.filter(r => r.id && registroIdsSet.has(r.id)) || []
        registrosMovidos.push(...registrosAMover)

        const nuevosRegistros = a.registros?.filter(r => !r.id || !registroIdsSet.has(r.id)) || []
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
    }).filter(a => (a.registros?.length || 0) > 0)

    if (registrosMovidos.length > 0) {
      const nuevoSinAsignar = [...sinAsignar, ...registrosMovidos]
      const nuevosTotales = calcularTotales(nuevasAgrupaciones, nuevoSinAsignar)
      const nuevasEstadisticas = calcularEstadisticas(registros, nuevasAgrupaciones, nuevoSinAsignar)

      set({
        agrupaciones: nuevasAgrupaciones,
        sinAsignar: nuevoSinAsignar,
        totales: nuevosTotales,
        estadisticas: nuevasEstadisticas
      })
    }
  },

  // Mover múltiples registros de una agrupación a otra
  moverRegistrosAOtraAgrupacion: (origenId, destinoId, registroIds) => {
    const { agrupaciones, sinAsignar, registros } = get()

    if (origenId === destinoId) return

    const registroIdsSet = new Set(registroIds)
    let registrosAMover: RegistroMayor[] = []

    // Primera pasada: extraer registros del origen
    const agrupacionesTemporal = agrupaciones.map(a => {
      if (a.id === origenId) {
        registrosAMover = a.registros?.filter(r => r.id && registroIdsSet.has(r.id)) || []
        const nuevosRegistros = a.registros?.filter(r => !r.id || !registroIdsSet.has(r.id)) || []
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

    if (registrosAMover.length === 0) return

    // Segunda pasada: agregar al destino
    const nuevasAgrupaciones = agrupacionesTemporal.map(a => {
      if (a.id === destinoId) {
        const nuevosRegistros = [...(a.registros || []), ...registrosAMover]
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
    }).filter(a => (a.registros?.length || 0) > 0)

    const nuevosTotales = calcularTotales(nuevasAgrupaciones, sinAsignar)
    const nuevasEstadisticas = calcularEstadisticas(registros, nuevasAgrupaciones, sinAsignar)

    set({
      agrupaciones: nuevasAgrupaciones,
      totales: nuevosTotales,
      estadisticas: nuevasEstadisticas
    })
  },

  // Reasignar saldo de una razón social a otra
  reasignarSaldo: (tipo, razonSocialOrigen, razonSocialDestino) => {
    const { saldosInicio, saldosCierre, agrupaciones } = get()

    if (tipo === 'inicio') {
      // Encontrar el saldo
      const saldo = saldosInicio.find(s => s.razonSocial === razonSocialOrigen)
      if (!saldo) return

      // Actualizar la agrupación destino con el saldo
      const nuevasAgrupaciones = agrupaciones.map(a => {
        if (normalizarRazonSocial(a.razonSocial || '') === normalizarRazonSocial(razonSocialDestino)) {
          return {
            ...a,
            saldoInicio: (a.saldoInicio || 0) + saldo.saldo,
          }
        }
        return a
      })

      // Eliminar el saldo de la lista (ya está asignado a la agrupación)
      const nuevosSaldosInicio = saldosInicio.filter(s => s.razonSocial !== razonSocialOrigen)

      set({
        agrupaciones: nuevasAgrupaciones,
        saldosInicio: nuevosSaldosInicio,
      })
    } else {
      // Encontrar el saldo de cierre
      const saldo = saldosCierre.find(s => s.razonSocial === razonSocialOrigen)
      if (!saldo) return

      // Actualizar la agrupación destino con el saldo
      const nuevasAgrupaciones = agrupaciones.map(a => {
        if (normalizarRazonSocial(a.razonSocial || '') === normalizarRazonSocial(razonSocialDestino)) {
          return {
            ...a,
            saldoCierre: (a.saldoCierre || 0) + saldo.saldo,
          }
        }
        return a
      })

      // Eliminar el saldo de la lista (ya está asignado a la agrupación)
      const nuevosSaldosCierre = saldosCierre.filter(s => s.razonSocial !== razonSocialOrigen)

      set({
        agrupaciones: nuevasAgrupaciones,
        saldosCierre: nuevosSaldosCierre,
      })
    }
  },

  // Limpiar todo
  limpiar: () => set({
    registros: [],
    agrupaciones: [],
    sinAsignar: [],
    totales: initialTotales,
    estadisticas: null,
    saldosInicio: [],
    saldosCierre: [],
    mayorIncluyeApertura: false,
    error: null,
    conciliacionActual: null,
    agrupacionSeleccionada: null,
    tabActiva: 'agrupaciones',
  }),

  // Obtener cuadro comparativo calculado
  getCuadroComparativo: () => {
    const { agrupaciones, saldosInicio, saldosCierre } = get()

    // Crear mapa de saldos inicio por razón social normalizada
    const mapaInicio = new Map<string, number>()
    saldosInicio.forEach(s => {
      mapaInicio.set(normalizarRazonSocial(s.razonSocial), s.saldo)
    })

    // Crear mapa de saldos cierre por razón social normalizada
    const mapaCierre = new Map<string, number>()
    saldosCierre.forEach(s => {
      mapaCierre.set(normalizarRazonSocial(s.razonSocial), s.saldo)
    })

    // Generar filas del cuadro
    const filas: FilaCuadroComparativo[] = agrupaciones.map(a => {
      const rsNorm = normalizarRazonSocial(a.razonSocial || '')

      const saldoInicio = a.saldoInicio ?? mapaInicio.get(rsNorm) ?? 0
      const debe = a.totalDebe || 0
      const haber = a.totalHaber || 0
      const saldoCalculado = saldoInicio + debe - haber
      const ajusteAuditoria = a.ajusteAuditoria || 0
      const saldoReportado = a.saldoCierre ?? mapaCierre.get(rsNorm) ?? 0
      const diferencia = saldoCalculado + ajusteAuditoria - saldoReportado

      let estado: 'ok' | 'diferencia' | 'sin_cierre' = 'ok'
      if (!mapaCierre.has(rsNorm) && (a.saldoCierre === undefined || a.saldoCierre === null)) {
        estado = 'sin_cierre'
      } else if (Math.abs(diferencia) > 0.01) {
        estado = 'diferencia'
      }

      return {
        razonSocial: a.razonSocial || '',
        saldoInicio,
        debe,
        haber,
        saldoCalculado,
        ajusteAuditoria,
        saldoReportado,
        diferencia,
        estado,
        notaAjuste: a.notaAjuste,
      }
    })

    return filas
  },

  // Obtener totales del cuadro comparativo
  getTotalesCuadro: () => {
    const cuadro = get().getCuadroComparativo()

    return cuadro.reduce((acc, fila) => ({
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
  },
}))
