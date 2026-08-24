import { prisma } from '../lib/prisma.js';

const MILISEGUNDOS_DIA = 86_400_000;

interface UnidadIndicador {
  id: number;
  numeroUnidad: string;
  placa: string;
}

interface ReemplazoIndicador {
  componenteUnidadId: number;
  componenteUnidad: {
    unidadId: number;
    estado: 'INSTALADO' | 'RETIRADO';
    fechaInstalacion: Date;
    fechaRetiro: Date | null;
    kilometrajeInstalacion: number;
    kilometrajeRetiro: number | null;
    vidaUtilMeses: number | null;
    vidaUtilKm: number | null;
    catalogoComponente: { id: number; nombre: string };
  };
}

type InterpretacionMuestra =
  | 'NO_HAY_DATOS_SUFICIENTES'
  | 'MUESTRA_LIMITADA'
  | 'DATOS_SUFICIENTES';

interface AcumuladorCriterio {
  reales: number[];
  esperados: number[];
  cumplimientos: number[];
  registrosExcluidos: number;
}

function redondear(valor: number): number {
  return Number(valor.toFixed(2));
}

function interpretacion(muestra: number): InterpretacionMuestra {
  if (muestra === 0) return 'NO_HAY_DATOS_SUFICIENTES';
  if (muestra <= 2) return 'MUESTRA_LIMITADA';
  return 'DATOS_SUFICIENTES';
}

function promedio(valores: number[]): number {
  return redondear(valores.reduce((total, valor) => total + valor, 0) / valores.length);
}

function agregarMesesCalendario(fecha: Date, meses: number): Date {
  const indiceMes = fecha.getUTCMonth() + meses;
  const inicioDestino = new Date(Date.UTC(fecha.getUTCFullYear(), indiceMes, 1));
  const ultimoDiaDestino = new Date(
    Date.UTC(inicioDestino.getUTCFullYear(), inicioDestino.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      inicioDestino.getUTCFullYear(),
      inicioDestino.getUTCMonth(),
      Math.min(fecha.getUTCDate(), ultimoDiaDestino),
    ),
  );
}

function diferenciaDias(inicio: Date, fin: Date): number {
  return Math.trunc((fin.getTime() - inicio.getTime()) / MILISEGUNDOS_DIA);
}

function resumirCriterio(acumulador: AcumuladorCriterio) {
  const muestra = acumulador.reales.length;
  if (muestra === 0) {
    return {
      vidaRealPromedio: null,
      vidaEsperadaPromedio: null,
      cumplimientoPromedio: null,
      muestra: 0,
      registrosExcluidos: acumulador.registrosExcluidos,
      interpretacion: interpretacion(0),
    };
  }
  return {
    vidaRealPromedio: promedio(acumulador.reales),
    vidaEsperadaPromedio: promedio(acumulador.esperados),
    cumplimientoPromedio: promedio(acumulador.cumplimientos),
    muestra,
    registrosExcluidos: acumulador.registrosExcluidos,
    interpretacion: interpretacion(muestra),
  };
}

function fechaHoraGuatemala(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '00';
  return `${valor('year')}-${valor('month')}-${valor('day')}T${valor('hour')}:${valor('minute')}:${valor('second')}-06:00`;
}

export function calcularIndicadoresMantenimiento(
  unidades: UnidadIndicador[],
  relaciones: ReemplazoIndicador[],
) {
  const deduplicados = [...new Map(
    relaciones.map((relacion) => [relacion.componenteUnidadId, relacion]),
  ).values()];
  const reemplazosValidos = deduplicados.filter(
    (relacion) => relacion.componenteUnidad.estado === 'RETIRADO',
  );

  const reemplazosPorUnidadMap = new Map<number, number>();
  const frecuenciaMap = new Map<number, { catalogoComponenteId: number; nombre: string; reemplazos: number }>();
  reemplazosValidos.forEach(({ componenteUnidad }) => {
    reemplazosPorUnidadMap.set(
      componenteUnidad.unidadId,
      (reemplazosPorUnidadMap.get(componenteUnidad.unidadId) ?? 0) + 1,
    );
    const catalogo = componenteUnidad.catalogoComponente;
    const actual = frecuenciaMap.get(catalogo.id);
    frecuenciaMap.set(catalogo.id, {
      catalogoComponenteId: catalogo.id,
      nombre: catalogo.nombre,
      reemplazos: (actual?.reemplazos ?? 0) + 1,
    });
  });

  const vidaMap = new Map<number, {
    catalogoComponenteId: number;
    nombre: string;
    kilometraje: AcumuladorCriterio;
    tiempo: AcumuladorCriterio;
  }>();
  reemplazosValidos.forEach(({ componenteUnidad }) => {
    const catalogo = componenteUnidad.catalogoComponente;
    let grupo = vidaMap.get(catalogo.id);
    if (!grupo) {
      grupo = {
        catalogoComponenteId: catalogo.id,
        nombre: catalogo.nombre,
        kilometraje: { reales: [], esperados: [], cumplimientos: [], registrosExcluidos: 0 },
        tiempo: { reales: [], esperados: [], cumplimientos: [], registrosExcluidos: 0 },
      };
      vidaMap.set(catalogo.id, grupo);
    }

    if (componenteUnidad.vidaUtilKm !== null) {
      const real = componenteUnidad.kilometrajeRetiro === null
        ? Number.NaN
        : componenteUnidad.kilometrajeRetiro - componenteUnidad.kilometrajeInstalacion;
      const esperado = componenteUnidad.vidaUtilKm;
      if (Number.isFinite(real) && real >= 0 && Number.isFinite(esperado) && esperado > 0) {
        grupo.kilometraje.reales.push(real);
        grupo.kilometraje.esperados.push(esperado);
        grupo.kilometraje.cumplimientos.push((real / esperado) * 100);
      } else {
        grupo.kilometraje.registrosExcluidos += 1;
      }
    }

    if (componenteUnidad.vidaUtilMeses !== null) {
      const fechaRetiro = componenteUnidad.fechaRetiro;
      const meses = componenteUnidad.vidaUtilMeses;
      const fechaEsperada = Number.isInteger(meses) && meses > 0
        ? agregarMesesCalendario(componenteUnidad.fechaInstalacion, meses)
        : null;
      const real = fechaRetiro ? diferenciaDias(componenteUnidad.fechaInstalacion, fechaRetiro) : Number.NaN;
      const esperado = fechaEsperada ? diferenciaDias(componenteUnidad.fechaInstalacion, fechaEsperada) : Number.NaN;
      if (Number.isFinite(real) && real >= 0 && Number.isFinite(esperado) && esperado > 0) {
        grupo.tiempo.reales.push(real);
        grupo.tiempo.esperados.push(esperado);
        grupo.tiempo.cumplimientos.push((real / esperado) * 100);
      } else {
        grupo.tiempo.registrosExcluidos += 1;
      }
    }
  });

  return {
    reemplazosPorUnidad: unidades.map((unidad) => ({
      unidadId: unidad.id,
      numeroUnidad: unidad.numeroUnidad,
      placa: unidad.placa,
      reemplazos: reemplazosPorUnidadMap.get(unidad.id) ?? 0,
    })).sort((a, b) => b.reemplazos - a.reemplazos || a.numeroUnidad.localeCompare(b.numeroUnidad)),
    vidaUtilPorCatalogo: [...vidaMap.values()].map((grupo) => {
      const km = resumirCriterio(grupo.kilometraje);
      const tiempo = resumirCriterio(grupo.tiempo);
      return {
        catalogoComponenteId: grupo.catalogoComponenteId,
        nombre: grupo.nombre,
        kilometraje: {
          vidaRealPromedioKm: km.vidaRealPromedio,
          vidaEsperadaPromedioKm: km.vidaEsperadaPromedio,
          cumplimientoPromedio: km.cumplimientoPromedio,
          muestra: km.muestra,
          registrosExcluidos: km.registrosExcluidos,
          interpretacion: km.interpretacion,
        },
        tiempo: {
          vidaRealPromedioDias: tiempo.vidaRealPromedio,
          vidaEsperadaPromedioDias: tiempo.vidaEsperadaPromedio,
          cumplimientoPromedio: tiempo.cumplimientoPromedio,
          muestra: tiempo.muestra,
          registrosExcluidos: tiempo.registrosExcluidos,
          interpretacion: tiempo.interpretacion,
        },
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    frecuenciaReemplazo: [...frecuenciaMap.values()].sort(
      (a, b) => b.reemplazos - a.reemplazos || a.nombre.localeCompare(b.nombre),
    ),
    metadatos: {
      periodo: 'TODO_HISTORIAL' as const,
      generadoEn: fechaHoraGuatemala(),
      reemplazosAnalizados: reemplazosValidos.length,
    },
  };
}

export async function obtenerIndicadoresMantenimiento() {
  const [unidades, relaciones] = await Promise.all([
    prisma.unidad.findMany({
      select: { id: true, numeroUnidad: true, placa: true },
      orderBy: { numeroUnidad: 'asc' },
    }),
    prisma.mantenimientoComponente.findMany({
      where: { accion: 'REEMPLAZO' },
      select: {
        componenteUnidadId: true,
        componenteUnidad: {
          select: {
            unidadId: true,
            estado: true,
            fechaInstalacion: true,
            fechaRetiro: true,
            kilometrajeInstalacion: true,
            kilometrajeRetiro: true,
            vidaUtilMeses: true,
            vidaUtilKm: true,
            catalogoComponente: { select: { id: true, nombre: true } },
          },
        },
      },
    }),
  ]);
  return calcularIndicadoresMantenimiento(unidades, relaciones);
}
