import {
  Router,
  type Request,
  type Response,
} from 'express';

import { prisma } from '../lib/prisma.js';

interface CrearMantenimientoBody {
  unidadId?: number;
  fechaInicio?: string;
  descripcion?: string;
  costo?: number;
}

export const mantenimientosRouter = Router();


mantenimientosRouter.get(
  '/',
  async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const mantenimientos =
        await prisma.mantenimiento.findMany({
          include: {
            unidad: true,
          },
          orderBy: [
            {
              estado: 'asc',
            },
            {
              fechaInicio: 'desc',
            },
          ],
        });

      res.status(200).json({
        success: true,
        message:
          'Mantenimientos obtenidos correctamente',
        data: mantenimientos,
      });
    } catch (error) {
      console.error(
        'Error al consultar mantenimientos:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible consultar los mantenimientos',
      });
    }
  },
);

mantenimientosRouter.patch(
  '/:id/finalizar',
  async (
    req: Request<
      { id: string },
      unknown,
      { fechaFin?: string }
    >,
    res: Response,
  ): Promise<void> => {
    try {
      const mantenimientoId = Number(req.params.id);
      const { fechaFin } = req.body;

      if (
        !Number.isInteger(mantenimientoId) ||
        mantenimientoId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'El identificador del mantenimiento no es válido',
        });
        return;
      }

      if (!fechaFin?.trim()) {
        res.status(400).json({
          success: false,
          message:
            'La fecha de finalización es obligatoria',
        });
        return;
      }

      const fechaFinConvertida = new Date(
        `${fechaFin}T00:00:00.000Z`,
      );

      if (
        Number.isNaN(fechaFinConvertida.getTime()) ||
        fechaFinConvertida
          .toISOString()
          .slice(0, 10) !== fechaFin
      ) {
        res.status(400).json({
          success: false,
          message:
            'La fecha de finalización no es válida',
        });
        return;
      }

      const fechaActualTexto = new Date()
        .toISOString()
        .slice(0, 10);

      const fechaActual = new Date(
        `${fechaActualTexto}T00:00:00.000Z`,
      );

      if (fechaFinConvertida > fechaActual) {
        res.status(400).json({
          success: false,
          message:
            'La fecha de finalización del mantenimiento no puede ser futura',
        });
        return;
      }

      const mantenimiento =
        await prisma.mantenimiento.findUnique({
          where: {
            id: mantenimientoId,
          },
          include: {
            unidad: true,
          },
        });

      if (!mantenimiento) {
        res.status(404).json({
          success: false,
          message:
            'El mantenimiento no existe',
        });
        return;
      }

      if (mantenimiento.estado === 'FINALIZADO') {
        res.status(409).json({
          success: false,
          message:
            'Este mantenimiento ya fue finalizado',
        });
        return;
      }

      if (
        fechaFinConvertida <
        mantenimiento.fechaInicio
      ) {
        res.status(400).json({
          success: false,
          message:
            'La fecha de finalización no puede ser anterior a la fecha de inicio',
        });
        return;
      }

      const resultado = await prisma.$transaction(
        async (transaccion) => {
          const mantenimientoActualizado =
            await transaccion.mantenimiento.update({
              where: {
                id: mantenimientoId,
              },
              data: {
                fechaFin: fechaFinConvertida,
                estado: 'FINALIZADO',
              },
            });

          const proximoMantenimientoKm =
            mantenimiento.unidad
              .intervaloMantenimientoKm !== null
              ? mantenimiento.unidad.kilometrajeActual +
              mantenimiento.unidad
                .intervaloMantenimientoKm
              : null;

          const unidadActualizada =
            await transaccion.unidad.update({
              where: {
                id: mantenimiento.unidadId,
              },
              data: {
                estado: 'DISPONIBLE',
                proximoMantenimientoKm,
              },
            });

          return {
            ...mantenimientoActualizado,
            unidad: unidadActualizada,
          };
        },
      );

      res.status(200).json({
        success: true,
        message:
          'Mantenimiento finalizado correctamente',
        data: resultado,
      });
    } catch (error) {
      console.error(
        'Error al finalizar mantenimiento:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible finalizar el mantenimiento',
      });
    }
  },
);

// Registra el inicio de un mantenimiento.
mantenimientosRouter.post(
  '/',
  async (
    req: Request<
      Record<string, never>,
      unknown,
      CrearMantenimientoBody
    >,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        unidadId,
        fechaInicio,
        descripcion,
        costo,
      } = req.body;

      if (
        unidadId === undefined ||
        !fechaInicio?.trim() ||
        !descripcion?.trim() ||
        costo === undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            'Completa todos los campos obligatorios',
        });
        return;
      }

      const unidadIdConvertido = Number(unidadId);
      const costoConvertido = Number(costo);

      if (
        !Number.isInteger(unidadIdConvertido) ||
        unidadIdConvertido <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'La unidad seleccionada no es válida',
        });
        return;
      }

      if (
        !Number.isFinite(costoConvertido) ||
        costoConvertido < 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'El costo del mantenimiento no es válido',
        });
        return;
      }

      const fechaInicioConvertida = new Date(
        `${fechaInicio}T00:00:00.000Z`,
      );

      if (
        Number.isNaN(fechaInicioConvertida.getTime()) ||
        fechaInicioConvertida
          .toISOString()
          .slice(0, 10) !== fechaInicio
      ) {
        res.status(400).json({
          success: false,
          message:
            'La fecha de inicio no es válida',
        });
        return;
      }

      const fechaActualTexto = new Date()
        .toISOString()
        .slice(0, 10);

      const fechaActual = new Date(
        `${fechaActualTexto}T00:00:00.000Z`,
      );

      if (fechaInicioConvertida > fechaActual) {
        res.status(400).json({
          success: false,
          message:
            'La fecha de inicio del mantenimiento no puede ser futura',
        });
        return;
      }

      const unidad = await prisma.unidad.findUnique({
        where: {
          id: unidadIdConvertido,
        },
      });

      if (!unidad) {
        res.status(404).json({
          success: false,
          message:
            'La unidad seleccionada no existe',
        });
        return;
      }

      const fechaInicioExclusiva = new Date(
        fechaInicioConvertida,
      );

      fechaInicioExclusiva.setUTCDate(
        fechaInicioExclusiva.getUTCDate() + 1,
      );

      const operacionExistente =
        await prisma.registroDiario.findFirst({
          where: {
            unidadId: unidadIdConvertido,
            fecha: {
              gte: fechaInicioConvertida,
              lt: fechaInicioExclusiva,
            },
          },
          select: {
            id: true,
          },
        });

      if (operacionExistente) {
        res.status(409).json({
          success: false,
          message:
            'La unidad ya tiene una operación registrada en la fecha seleccionada',
        });
        return;
      }
      if (unidad.estado !== 'DISPONIBLE') {
        res.status(409).json({
          success: false,
          message:
            'La unidad seleccionada no está disponible para iniciar mantenimiento',
        });
        return;
      }

      const mantenimientoActivo =
        await prisma.mantenimiento.findFirst({
          where: {
            unidadId: unidadIdConvertido,
            estado: 'EN_PROCESO',
          },
        });

      if (mantenimientoActivo) {
        res.status(409).json({
          success: false,
          message:
            'La unidad ya tiene un mantenimiento en proceso',
        });
        return;
      }

      const resultado = await prisma.$transaction(
        async (transaccion) => {
          const mantenimiento =
            await transaccion.mantenimiento.create({
              data: {
                unidadId: unidadIdConvertido,
                fechaInicio:
                  fechaInicioConvertida,
                kilometraje:
                  unidad.kilometrajeActual,
                descripcion: descripcion.trim(),
                costo:
                  costoConvertido.toFixed(2),
              },
            });

          const unidadActualizada =
            await transaccion.unidad.update({
              where: {
                id: unidadIdConvertido,
              },
              data: {
                estado: 'MANTENIMIENTO',
              },
            });

          return {
            ...mantenimiento,
            unidad: unidadActualizada,
          };
        },
      );

      res.status(201).json({
        success: true,
        message:
          'Mantenimiento registrado correctamente',
        data: resultado,
      });
    } catch (error) {
      console.error(
        'Error al registrar mantenimiento:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible registrar el mantenimiento',
      });
    }
  },
);