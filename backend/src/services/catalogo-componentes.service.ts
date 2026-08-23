import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type {
  ActualizarCatalogoComponenteDatos,
  CrearCatalogoComponenteDatos,
} from '../schemas/catalogo-componentes.schemas.js';

const seleccionCatalogo = {
  id: true,
  nombre: true,
  descripcion: true,
  vidaUtilMesesDefault: true,
  vidaUtilKmDefault: true,
  alertaDiasAntesDefault: true,
  alertaKmAntesDefault: true,
  modoInstalacion: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
  posiciones: {
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    select: {
      id: true,
      codigo: true,
      nombre: true,
      orden: true,
      activo: true,
    },
  },
} satisfies Prisma.CatalogoComponenteSelect;

export class ErrorCatalogoComponentes extends Error {
  constructor(
    readonly status: 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorCatalogoComponentes';
  }
}

async function validarNombreDisponible(
  nombre: string,
  componenteId?: number,
): Promise<void> {
  const coincidencias = await prisma.$queryRaw<
    Array<{ id: number }>
  >(Prisma.sql`
    SELECT id
    FROM catalogo_componentes
    WHERE UPPER(BTRIM(nombre)) = UPPER(BTRIM(${nombre}))
      ${
        componenteId === undefined
          ? Prisma.empty
          : Prisma.sql`AND id <> ${componenteId}`
      }
    LIMIT 1
  `);

  if (coincidencias.length > 0) {
    throw new ErrorCatalogoComponentes(
      409,
      'Ya existe un componente con ese nombre',
    );
  }
}

export async function listarCatalogoComponentes() {
  return prisma.catalogoComponente.findMany({
    select: seleccionCatalogo,
    orderBy: {
      nombre: 'asc',
    },
  });
}

export async function obtenerCatalogoComponente(
  componenteId: number,
) {
  const componente =
    await prisma.catalogoComponente.findUnique({
      where: { id: componenteId },
      select: seleccionCatalogo,
    });

  if (!componente) {
    throw new ErrorCatalogoComponentes(
      404,
      'El componente del catálogo no existe',
    );
  }

  return componente;
}

export async function crearCatalogoComponente(
  datos: CrearCatalogoComponenteDatos,
) {
  await validarNombreDisponible(datos.nombre);

  const { posiciones, ...datosCatalogo } = datos;

  return prisma.catalogoComponente.create({
    data: {
      ...datosCatalogo,
      posiciones: {
        create: posiciones.map(({ id: _id, ...posicion }) => posicion),
      },
    },
    select: seleccionCatalogo,
  });
}

export async function actualizarCatalogoComponente(
  componenteId: number,
  datos: ActualizarCatalogoComponenteDatos,
) {
  await validarNombreDisponible(datos.nombre, componenteId);

  const { posiciones, ...datosCatalogo } = datos;

  return prisma.$transaction(async (transaccion) => {
    const actual = await transaccion.catalogoComponente.findUnique({
      where: { id: componenteId },
      select: {
        id: true,
        posiciones: {
          select: {
            id: true,
            componentesUnidad: {
              where: { estado: 'INSTALADO' },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!actual) {
      throw new ErrorCatalogoComponentes(
        404,
        'El componente del catálogo no existe',
      );
    }

    const idsRecibidos = new Set(
      posiciones.flatMap((posicion) =>
        posicion.id === undefined ? [] : [posicion.id],
      ),
    );

    for (const posicionActual of actual.posiciones) {
      const posicionNueva = posiciones.find(
        (posicion) => posicion.id === posicionActual.id,
      );
      const seDesactiva = !posicionNueva || !posicionNueva.activo;

      if (
        seDesactiva &&
        posicionActual.componentesUnidad.length > 0
      ) {
        throw new ErrorCatalogoComponentes(
          409,
          'No puedes desactivar una posición que tiene componentes instalados',
        );
      }
    }

    const idsExistentes = new Set(
      actual.posiciones.map((posicion) => posicion.id),
    );
    if ([...idsRecibidos].some((id) => !idsExistentes.has(id))) {
      throw new ErrorCatalogoComponentes(
        409,
        'Una de las posiciones no pertenece al componente',
      );
    }

    await transaccion.catalogoComponente.update({
      where: { id: componenteId },
      data: datosCatalogo,
    });

    for (const posicion of posiciones) {
      const { id, ...datosPosicion } = posicion;
      if (id === undefined) {
        await transaccion.posicionCatalogoComponente.create({
          data: {
            ...datosPosicion,
            catalogoComponenteId: componenteId,
          },
        });
      } else {
        await transaccion.posicionCatalogoComponente.update({
          where: { id },
          data: datosPosicion,
        });
      }
    }

    await transaccion.posicionCatalogoComponente.updateMany({
      where: {
        catalogoComponenteId: componenteId,
        ...(idsRecibidos.size > 0
          ? { id: { notIn: [...idsRecibidos] } }
          : {}),
      },
      data: { activo: false },
    });

    return transaccion.catalogoComponente.findUniqueOrThrow({
      where: { id: componenteId },
      select: seleccionCatalogo,
    });
  });
}

export async function cambiarEstadoCatalogoComponente(
  componenteId: number,
  activo: boolean,
) {
  await obtenerCatalogoComponente(componenteId);

  return prisma.catalogoComponente.update({
    where: { id: componenteId },
    data: { activo },
    select: seleccionCatalogo,
  });
}
