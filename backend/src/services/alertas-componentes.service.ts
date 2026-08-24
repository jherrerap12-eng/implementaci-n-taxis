import { prisma } from '../lib/prisma.js';
import { evaluarVidaUtilComponente } from './vida-util.service.js';

export interface AlertaComponente {
  id: number;
  unidad: string;
  placa: string;
  nombreComponente: string;
  marca: string | null;
  modelo: string | null;
  posicion: string | null;
  estado: 'PROXIMO_CAMBIO' | 'URGENTE';
  motivo: 'NINGUNO' | 'TIEMPO' | 'KILOMETRAJE' | 'AMBOS';
  nivelRiesgo: 'VERDE' | 'NARANJA' | 'AMARILLO' | 'ROJO';
  porcentajeVidaRestante: number;
  diasRestantes: number | null;
  kilometrosRestantes: number | null;
  detalle: string;
}

function obtenerFechaActualGuatemala(): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return new Date(`${partes}T00:00:00.000Z`);
}

export async function obtenerAlertasComponentes(
  fechaEvaluacion = obtenerFechaActualGuatemala(),
): Promise<AlertaComponente[]> {
  const componentes = await prisma.componenteUnidad.findMany({
    where: {
      estado: 'INSTALADO',
    },
    select: {
      id: true,
      marca: true,
      modelo: true,
      posicion: true,
      posicionCatalogo: {
        select: { nombre: true },
      },
      fechaInstalacion: true,
      kilometrajeInstalacion: true,
      vidaUtilMeses: true,
      vidaUtilKm: true,
      alertaDiasAntes: true,
      alertaKmAntes: true,
      catalogoComponente: {
        select: {
          nombre: true,
        },
      },
      unidad: {
        select: {
          numeroUnidad: true,
          placa: true,
          kilometrajeActual: true,
        },
      },
    },
  });

  return componentes
    .map((componente) => {
      const evaluacion = evaluarVidaUtilComponente(
        componente,
        fechaEvaluacion,
        componente.unidad.kilometrajeActual,
      );

      return {
        id: componente.id,
        unidad: componente.unidad.numeroUnidad,
        placa: componente.unidad.placa,
        nombreComponente: componente.catalogoComponente.nombre,
        marca: componente.marca,
        modelo: componente.modelo,
        posicion:
          componente.posicion ?? componente.posicionCatalogo?.nombre ?? null,
        estado: evaluacion.estado,
        motivo: evaluacion.motivo,
        nivelRiesgo: evaluacion.nivelRiesgo,
        porcentajeVidaRestante: evaluacion.porcentajeVidaRestante,
        diasRestantes: evaluacion.diasRestantes,
        kilometrosRestantes: evaluacion.kilometrosRestantes,
        detalle: evaluacion.detalle,
      };
    })
    .filter(
      (alerta): alerta is AlertaComponente =>
        alerta.estado === 'PROXIMO_CAMBIO' ||
        alerta.estado === 'URGENTE',
    )
    .sort((a, b) => {
      if (a.estado !== b.estado) {
        return a.estado === 'URGENTE' ? -1 : 1;
      }

      if (a.porcentajeVidaRestante !== b.porcentajeVidaRestante) {
        return a.porcentajeVidaRestante - b.porcentajeVidaRestante;
      }

      return a.unidad.localeCompare(b.unidad);
    });
}
