import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import type { CrearMantenimientoDatos, FinalizarMantenimientoDatos } from '../schemas/mantenimientos.schemas.js';

export class ErrorMantenimiento extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ErrorMantenimiento';
  }
}

const incluirMantenimiento = {
  unidad: true,
  componentes: {
    include: {
      componenteUnidad: {
        include: { catalogoComponente: true, posicionCatalogo: true },
      },
    },
    orderBy: { creadoEn: 'asc' as const },
  },
} as const;

export function obtenerFechaActualGuatemala(fecha = new Date()): Date {
  const texto = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
  return new Date(`${texto}T00:00:00.000Z`);
}

function presentarMantenimiento<T extends { componentes: Array<{
  id: number;
  accion: string;
  observaciones: string | null;
  creadoEn: Date;
  componenteUnidad: {
    id: number;
    posicion: string | null;
    estado: string;
    marca: string | null;
    modelo: string | null;
    catalogoComponente: { nombre: string };
    posicionCatalogo: { nombre: string } | null;
  };
}>; kilometraje: number; kilometrajeObjetivo: number | null }>(mantenimiento: T) {
  const diferenciaKilometraje = mantenimiento.kilometrajeObjetivo === null
    ? null
    : mantenimiento.kilometraje - mantenimiento.kilometrajeObjetivo;
  const cumplimientoKilometraje = diferenciaKilometraje === null
    ? 'SIN_OBJETIVO'
    : diferenciaKilometraje === 0
      ? 'EXACTO'
      : diferenciaKilometraje < 0
        ? 'ANTICIPADO'
        : 'ATRASADO';

  return {
    ...mantenimiento,
    diferenciaKilometraje,
    cumplimientoKilometraje,
    componentes: mantenimiento.componentes.map((relacion) => ({
      id: relacion.id,
      accion: relacion.accion,
      observaciones: relacion.observaciones,
      creadoEn: relacion.creadoEn,
      componente: {
        id: relacion.componenteUnidad.id,
        nombre: relacion.componenteUnidad.catalogoComponente.nombre,
        marca: relacion.componenteUnidad.marca,
        modelo: relacion.componenteUnidad.modelo,
        posicion: relacion.componenteUnidad.posicion ?? relacion.componenteUnidad.posicionCatalogo?.nombre ?? null,
        estado: relacion.componenteUnidad.estado,
      },
    })),
  };
}

export async function listarMantenimientos() {
  const mantenimientos = await prisma.mantenimiento.findMany({
    include: incluirMantenimiento,
    orderBy: [{ estado: 'asc' }, { fechaInicio: 'desc' }],
  });
  return mantenimientos.map(presentarMantenimiento);
}

export async function obtenerMantenimiento(mantenimientoId: number) {
  const mantenimiento = await prisma.mantenimiento.findUnique({ where: { id: mantenimientoId }, include: incluirMantenimiento });
  if (!mantenimiento) throw new ErrorMantenimiento('El mantenimiento no existe', 404);
  return presentarMantenimiento(mantenimiento);
}

export async function obtenerMantenimientosActivosPorUnidad(unidadId: number) {
  const mantenimientos = await prisma.mantenimiento.findMany({
    where: { unidadId, estado: 'EN_PROCESO' },
    include: incluirMantenimiento,
    orderBy: { fechaInicio: 'desc' },
  });
  return mantenimientos.map(presentarMantenimiento);
}

export async function validarMantenimientoActivo(
  mantenimientoId: number,
  unidadId: number,
  cliente: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const mantenimiento = await cliente.mantenimiento.findUnique({ where: { id: mantenimientoId } });
  if (!mantenimiento) throw new ErrorMantenimiento('El mantenimiento no existe', 404);
  if (mantenimiento.unidadId !== unidadId) throw new ErrorMantenimiento('El mantenimiento no pertenece a la unidad indicada', 409);
  if (mantenimiento.estado !== 'EN_PROCESO') throw new ErrorMantenimiento('El mantenimiento no está activo para recibir acciones', 409);
  return mantenimiento;
}

export async function crearMantenimientoEnTransaccion(
  transaccion: Prisma.TransactionClient,
  datos: CrearMantenimientoDatos & { kilometrajeObjetivo?: number | null },
) {
  if (datos.fechaInicio > obtenerFechaActualGuatemala()) throw new ErrorMantenimiento('La fecha de inicio del mantenimiento no puede ser futura', 400);
  const unidadBloqueada = await transaccion.$queryRaw<Array<{ id: number }>>(
    Prisma.sql`SELECT id FROM unidades WHERE id = ${datos.unidadId} FOR UPDATE`,
  );
  if (unidadBloqueada.length === 0) throw new ErrorMantenimiento('La unidad seleccionada no existe', 404);
  const unidad = await transaccion.unidad.findUnique({ where: { id: datos.unidadId } });
  if (!unidad) throw new ErrorMantenimiento('La unidad seleccionada no existe', 404);

  const fechaInicioExclusiva = new Date(datos.fechaInicio);
  fechaInicioExclusiva.setUTCDate(fechaInicioExclusiva.getUTCDate() + 1);
  const operacionExistente = await transaccion.registroDiario.findFirst({
    where: { unidadId: datos.unidadId, fecha: { gte: datos.fechaInicio, lt: fechaInicioExclusiva } },
    select: { id: true },
  });
  if (operacionExistente) throw new ErrorMantenimiento('La unidad ya tiene una operación registrada en la fecha seleccionada', 409);
  if (unidad.estado !== 'DISPONIBLE') throw new ErrorMantenimiento('La unidad seleccionada no está disponible para iniciar mantenimiento', 409);

  const mantenimientoActivo = await transaccion.mantenimiento.findFirst({ where: { unidadId: datos.unidadId, estado: 'EN_PROCESO' }, select: { id: true } });
  if (mantenimientoActivo) throw new ErrorMantenimiento('La unidad ya tiene un mantenimiento en proceso', 409);

  const mantenimiento = await transaccion.mantenimiento.create({
    data: {
      unidadId: datos.unidadId,
      fechaInicio: datos.fechaInicio,
      kilometraje: unidad.kilometrajeActual,
      kilometrajeObjetivo:
        datos.kilometrajeObjetivo === undefined
          ? unidad.proximoMantenimientoKm
          : datos.kilometrajeObjetivo,
      descripcion: datos.descripcion,
      costo: datos.costo.toFixed(2),
    },
  });
  const unidadActualizada = await transaccion.unidad.update({ where: { id: datos.unidadId }, data: { estado: 'MANTENIMIENTO' } });
  return { ...mantenimiento, unidad: unidadActualizada, componentes: [] };
}

export async function crearMantenimiento(datos: CrearMantenimientoDatos) {
  return prisma.$transaction((transaccion) =>
    crearMantenimientoEnTransaccion(transaccion, datos),
  );
}

export async function finalizarMantenimiento(mantenimientoId: number, datos: FinalizarMantenimientoDatos) {
  if (datos.fechaFin > obtenerFechaActualGuatemala()) throw new ErrorMantenimiento('La fecha de finalización del mantenimiento no puede ser futura', 400);

  return prisma.$transaction(async (transaccion) => {
    const mantenimiento = await transaccion.mantenimiento.findUnique({
      where: { id: mantenimientoId },
      include: { unidad: true },
    });
    if (!mantenimiento) throw new ErrorMantenimiento('El mantenimiento no existe', 404);
    if (datos.fechaFin < mantenimiento.fechaInicio) throw new ErrorMantenimiento('La fecha de finalización no puede ser anterior a la fecha de inicio', 400);

    const finalizacion = await transaccion.mantenimiento.updateMany({
      where: { id: mantenimientoId, estado: 'EN_PROCESO' },
      data: { fechaFin: datos.fechaFin, estado: 'FINALIZADO' },
    });
    if (finalizacion.count !== 1) {
      throw new ErrorMantenimiento('El mantenimiento ya no se encuentra EN_PROCESO', 409);
    }

    const proximoMantenimientoKm = mantenimiento.unidad.intervaloMantenimientoKm !== null
      ? mantenimiento.unidad.kilometrajeActual + mantenimiento.unidad.intervaloMantenimientoKm
      : null;

    const liberacion = await transaccion.unidad.updateMany({
      where: { id: mantenimiento.unidadId, estado: 'MANTENIMIENTO' },
      data: { estado: 'DISPONIBLE', proximoMantenimientoKm },
    });
    if (liberacion.count !== 1) {
      throw new ErrorMantenimiento('La unidad ya no se encuentra en mantenimiento', 409);
    }

    const [mantenimientoActualizado, unidadActualizada] = await Promise.all([
      transaccion.mantenimiento.findUniqueOrThrow({ where: { id: mantenimientoId } }),
      transaccion.unidad.findUniqueOrThrow({ where: { id: mantenimiento.unidadId } }),
    ]);
    return { ...mantenimientoActualizado, unidad: unidadActualizada, componentes: [] };
  });
}
