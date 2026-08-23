import { prisma } from '../lib/prisma.js';
import type {
  InstalarComponenteDatos,
  ReemplazarComponenteDatos,
  RetirarComponenteDatos,
} from '../schemas/componentes-unidad.schemas.js';
import { evaluarVidaUtilComponente } from './vida-util.service.js';

const seleccionComponenteUnidad = {
  id: true,
  marca: true,
  modelo: true,
  numeroSerie: true,
  posicion: true,
  posicionCatalogoId: true,
  cantidad: true,
  fechaInstalacion: true,
  kilometrajeInstalacion: true,
  vidaUtilMeses: true,
  vidaUtilKm: true,
  alertaDiasAntes: true,
  alertaKmAntes: true,
  estado: true,
  fechaRetiro: true,
  kilometrajeRetiro: true,
  motivoRetiro: true,
  creadoEn: true,
  actualizadoEn: true,
  unidad: {
    select: {
      id: true,
      numeroUnidad: true,
      placa: true,
      kilometrajeActual: true,
    },
  },
  catalogoComponente: {
    select: {
      id: true,
      nombre: true,
      activo: true,
      modoInstalacion: true,
    },
  },
  posicionCatalogo: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      activo: true,
    },
  },
} as const;

export class ErrorComponentesUnidad extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorComponentesUnidad';
  }
}

function fechaActualGuatemala(): Date {
  const fecha = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return new Date(`${fecha}T00:00:00.000Z`);
}

export async function listarComponentesUnidad() {
  const componentes = await prisma.componenteUnidad.findMany({
    select: seleccionComponenteUnidad,
    orderBy: [
      { estado: 'asc' },
      { unidad: { numeroUnidad: 'asc' } },
      { catalogoComponente: { nombre: 'asc' } },
    ],
  });

  const fechaEvaluacion = fechaActualGuatemala();

  return componentes.map((componente) => ({
    ...componente,
    evaluacionVidaUtil:
      componente.estado === 'INSTALADO'
        ? evaluarVidaUtilComponente(
            componente,
            fechaEvaluacion,
            componente.unidad.kilometrajeActual,
          )
        : null,
  }));
}

export async function instalarComponente(
  datos: InstalarComponenteDatos,
) {
  return prisma.$transaction(async (transaccion) => {
    const unidad = await transaccion.unidad.findUnique({
      where: { id: datos.unidadId },
      select: { id: true, kilometrajeActual: true },
    });

    const catalogo = await transaccion.catalogoComponente.findUnique({
      where: { id: datos.catalogoComponenteId },
      select: {
        id: true,
        activo: true,
        modoInstalacion: true,
        vidaUtilMesesDefault: true,
        vidaUtilKmDefault: true,
        alertaDiasAntesDefault: true,
        alertaKmAntesDefault: true,
        posiciones: {
          where: { activo: true },
          select: { id: true, nombre: true },
        },
      },
    });

    if (!unidad) {
      throw new ErrorComponentesUnidad(404, 'La unidad no existe');
    }

    if (!catalogo) {
      throw new ErrorComponentesUnidad(
        404,
        'El componente del catálogo no existe',
      );
    }

    if (!catalogo.activo) {
      throw new ErrorComponentesUnidad(
        409,
        'No puedes instalar un componente inactivo del catálogo',
      );
    }

    if (datos.fechaInstalacion > fechaActualGuatemala()) {
      throw new ErrorComponentesUnidad(
        400,
        'La fecha de instalación no puede ser futura',
      );
    }

    if (datos.kilometrajeInstalacion > unidad.kilometrajeActual) {
      throw new ErrorComponentesUnidad(
        400,
        'El kilometraje de instalación no puede superar el kilometraje actual de la unidad',
      );
    }

    const vidaUtilMeses =
      datos.vidaUtilMeses ?? catalogo.vidaUtilMesesDefault;
    const vidaUtilKm = datos.vidaUtilKm ?? catalogo.vidaUtilKmDefault;

    if (vidaUtilMeses === null && vidaUtilKm === null) {
      throw new ErrorComponentesUnidad(
        400,
        'La instalación debe tener vida útil por meses, kilómetros o ambos',
      );
    }

    const datosComunes = {
        unidadId: datos.unidadId,
        catalogoComponenteId: datos.catalogoComponenteId,
        marca: datos.marca,
        modelo: datos.modelo,
        fechaInstalacion: datos.fechaInstalacion,
        kilometrajeInstalacion: datos.kilometrajeInstalacion,
        vidaUtilMeses,
        vidaUtilKm,
        alertaDiasAntes:
          datos.alertaDiasAntes ?? catalogo.alertaDiasAntesDefault,
        alertaKmAntes:
          datos.alertaKmAntes ?? catalogo.alertaKmAntesDefault,
    };

    if (catalogo.modoInstalacion === 'INDIVIDUAL') {
      if (datos.posicionesCatalogoIds.length > 0) {
        throw new ErrorComponentesUnidad(
          400,
          'Un componente individual no admite posiciones configuradas',
        );
      }

      const componente = await transaccion.componenteUnidad.create({
        data: {
          ...datosComunes,
          numeroSerie: datos.numeroSerie,
          posicion: null,
          cantidad: datos.cantidad,
        },
        select: seleccionComponenteUnidad,
      });

      return [componente];
    }

    if (datos.posicionesCatalogoIds.length === 0) {
      throw new ErrorComponentesUnidad(
        400,
        'Selecciona al menos una posición para instalar el componente',
      );
    }

    const posiciones = catalogo.posiciones.filter((posicion) =>
      datos.posicionesCatalogoIds.includes(posicion.id),
    );

    if (posiciones.length !== datos.posicionesCatalogoIds.length) {
      throw new ErrorComponentesUnidad(
        400,
        'Una de las posiciones no está activa o no pertenece al componente',
      );
    }

    const ocupadas = await transaccion.componenteUnidad.findMany({
      where: {
        unidadId: datos.unidadId,
        catalogoComponenteId: datos.catalogoComponenteId,
        estado: 'INSTALADO',
        posicionCatalogoId: { in: datos.posicionesCatalogoIds },
      },
      select: { posicionCatalogoId: true },
    });

    if (ocupadas.length > 0) {
      throw new ErrorComponentesUnidad(
        409,
        'Una o más posiciones seleccionadas ya están ocupadas',
      );
    }

    const componentesCreados = [];

    for (const posicion of posiciones) {
      componentesCreados.push(
        await transaccion.componenteUnidad.create({
          data: {
            ...datosComunes,
            numeroSerie: null,
            posicionCatalogoId: posicion.id,
            posicion: posicion.nombre,
            cantidad: 1,
          },
          select: seleccionComponenteUnidad,
        }),
      );
    }

    return componentesCreados;
  });
}

export async function retirarComponente(
  componenteId: number,
  datos: RetirarComponenteDatos,
) {
  return prisma.$transaction(async (transaccion) => {
    const componente = await transaccion.componenteUnidad.findUnique({
      where: { id: componenteId },
      select: {
        id: true,
        estado: true,
        fechaInstalacion: true,
        kilometrajeInstalacion: true,
        unidad: { select: { kilometrajeActual: true } },
      },
    });

    if (!componente) {
      throw new ErrorComponentesUnidad(404, 'El componente instalado no existe');
    }

    if (componente.estado !== 'INSTALADO') {
      throw new ErrorComponentesUnidad(409, 'El componente ya fue retirado');
    }

    if (
      datos.fechaRetiro < componente.fechaInstalacion ||
      datos.fechaRetiro > fechaActualGuatemala()
    ) {
      throw new ErrorComponentesUnidad(
        400,
        'La fecha de retiro debe estar entre la instalación y la fecha actual',
      );
    }

    if (
      datos.kilometrajeRetiro < componente.kilometrajeInstalacion ||
      datos.kilometrajeRetiro > componente.unidad.kilometrajeActual
    ) {
      throw new ErrorComponentesUnidad(
        400,
        'El kilometraje de retiro debe estar entre el kilometraje de instalación y el actual de la unidad',
      );
    }

    const resultado = await transaccion.componenteUnidad.updateMany({
      where: { id: componenteId, estado: 'INSTALADO' },
      data: {
        estado: 'RETIRADO',
        fechaRetiro: datos.fechaRetiro,
        kilometrajeRetiro: datos.kilometrajeRetiro,
        motivoRetiro: datos.motivoRetiro,
      },
    });

    if (resultado.count !== 1) {
      throw new ErrorComponentesUnidad(409, 'El componente ya fue retirado');
    }

    return transaccion.componenteUnidad.findUniqueOrThrow({
      where: { id: componenteId },
      select: seleccionComponenteUnidad,
    });
  });
}

export async function reemplazarComponente(
  componenteId: number,
  datos: ReemplazarComponenteDatos,
) {
  return prisma.$transaction(async (transaccion) => {
    const componente = await transaccion.componenteUnidad.findUnique({
      where: { id: componenteId },
      select: {
        id: true,
        estado: true,
        unidadId: true,
        catalogoComponenteId: true,
        posicionCatalogoId: true,
        posicion: true,
        cantidad: true,
        fechaInstalacion: true,
        kilometrajeInstalacion: true,
        observaciones: true,
        unidad: {
          select: { kilometrajeActual: true },
        },
        catalogoComponente: {
          select: {
            activo: true,
            modoInstalacion: true,
            vidaUtilMesesDefault: true,
            vidaUtilKmDefault: true,
            alertaDiasAntesDefault: true,
            alertaKmAntesDefault: true,
          },
        },
        posicionCatalogo: {
          select: {
            id: true,
            catalogoComponenteId: true,
            nombre: true,
            activo: true,
          },
        },
      },
    });

    if (!componente) {
      throw new ErrorComponentesUnidad(
        404,
        'El componente instalado no existe',
      );
    }

    if (componente.estado !== 'INSTALADO') {
      throw new ErrorComponentesUnidad(
        409,
        'Solo puedes reemplazar un componente instalado',
      );
    }

    if (!componente.catalogoComponente.activo) {
      throw new ErrorComponentesUnidad(
        409,
        'No puedes instalar un componente inactivo del catálogo',
      );
    }

    const fechaActual = fechaActualGuatemala();
    if (
      datos.fechaRetiro < componente.fechaInstalacion ||
      datos.fechaRetiro > fechaActual
    ) {
      throw new ErrorComponentesUnidad(
        400,
        'La fecha de retiro debe estar entre la instalación original y la fecha actual',
      );
    }

    if (
      datos.kilometrajeRetiro < componente.kilometrajeInstalacion ||
      datos.kilometrajeRetiro > componente.unidad.kilometrajeActual
    ) {
      throw new ErrorComponentesUnidad(
        400,
        'El kilometraje de retiro debe estar entre la instalación original y el kilometraje actual',
      );
    }

    if (
      datos.fechaInstalacion < datos.fechaRetiro ||
      datos.fechaInstalacion > fechaActual
    ) {
      throw new ErrorComponentesUnidad(
        400,
        'La nueva instalación no puede ser anterior al retiro ni futura',
      );
    }

    if (
      datos.kilometrajeInstalacion < datos.kilometrajeRetiro ||
      datos.kilometrajeInstalacion > componente.unidad.kilometrajeActual
    ) {
      throw new ErrorComponentesUnidad(
        400,
        'El kilometraje de la nueva instalación debe estar entre el retiro y el kilometraje actual',
      );
    }

    if (componente.catalogoComponente.modoInstalacion === 'POSICIONADO') {
      if (
        !componente.posicionCatalogo ||
        !componente.posicionCatalogo.activo ||
        componente.posicionCatalogo.catalogoComponenteId !==
          componente.catalogoComponenteId
      ) {
        throw new ErrorComponentesUnidad(
          409,
          'La posición actual no es válida para realizar el reemplazo',
        );
      }
    }

    const vidaUtilMeses =
      datos.vidaUtilMeses ??
      componente.catalogoComponente.vidaUtilMesesDefault;
    const vidaUtilKm =
      datos.vidaUtilKm ?? componente.catalogoComponente.vidaUtilKmDefault;

    if (vidaUtilMeses === null && vidaUtilKm === null) {
      throw new ErrorComponentesUnidad(
        400,
        'El nuevo componente debe tener vida útil por meses, kilómetros o ambos',
      );
    }

    const retiro = await transaccion.componenteUnidad.updateMany({
      where: { id: componenteId, estado: 'INSTALADO' },
      data: {
        estado: 'RETIRADO',
        fechaRetiro: datos.fechaRetiro,
        kilometrajeRetiro: datos.kilometrajeRetiro,
        motivoRetiro: datos.motivoRetiro,
        observaciones:
          datos.observacionesRetiro ?? componente.observaciones,
      },
    });

    if (retiro.count !== 1) {
      throw new ErrorComponentesUnidad(
        409,
        'El componente ya fue procesado por otra operación',
      );
    }

    const nuevo = await transaccion.componenteUnidad.create({
      data: {
        unidadId: componente.unidadId,
        catalogoComponenteId: componente.catalogoComponenteId,
        posicionCatalogoId: componente.posicionCatalogoId,
        posicion:
          componente.posicionCatalogo?.nombre ?? componente.posicion,
        marca: datos.marca,
        modelo: datos.modelo,
        numeroSerie: datos.numeroSerie,
        cantidad:
          componente.catalogoComponente.modoInstalacion === 'POSICIONADO'
            ? 1
            : componente.cantidad,
        fechaInstalacion: datos.fechaInstalacion,
        kilometrajeInstalacion: datos.kilometrajeInstalacion,
        vidaUtilMeses,
        vidaUtilKm,
        alertaDiasAntes:
          datos.alertaDiasAntes ??
          componente.catalogoComponente.alertaDiasAntesDefault,
        alertaKmAntes:
          datos.alertaKmAntes ??
          componente.catalogoComponente.alertaKmAntesDefault,
      },
      select: seleccionComponenteUnidad,
    });

    const anterior =
      await transaccion.componenteUnidad.findUniqueOrThrow({
        where: { id: componenteId },
        select: seleccionComponenteUnidad,
      });

    return { anterior, nuevo };
  });
}
