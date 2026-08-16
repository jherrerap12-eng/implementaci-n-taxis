import { Router, type Request, type Response } from 'express';

import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

interface CrearUnidadBody {
  numeroUnidad?: string;
  placa?: string;
  marca?: string;
  modelo?: string;
  anio?: number | string;
  tipoCombustible?: 'GASOLINA' | 'DIESEL';
  kilometrajeActual?: number | string;
  intervaloMantenimientoKm?: number | string | null;
  proximoMantenimientoKm?: number | string | null;
  observaciones?: string;
}

interface ActualizarUnidadBody {
  numeroUnidad?: string;
  placa?: string;
  marca?: string;
  modelo?: string;
  anio?: number | string;
  tipoCombustible?: 'GASOLINA' | 'DIESEL';
  intervaloMantenimientoKm?: number | string | null;
  proximoMantenimientoKm?: number | string | null;
  observaciones?: string;
}

interface CambiarEstadoUnidadBody {
  estado?:
  | 'DISPONIBLE'
  | 'EN_RUTA'
  | 'FUERA_DE_SERVICIO';
}

export const unidadesRouter = Router();

// Obtiene todas las unidades registradas.
unidadesRouter.get(
  '/',
  async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const unidades = await prisma.unidad.findMany({
        orderBy: {
          numeroUnidad: 'asc',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Unidades obtenidas correctamente',
        data: unidades,
      });
    } catch (error) {
      console.error(
        'Error al consultar unidades:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible consultar las unidades',
      });
    }
  },
);

// Registra una nueva unidad.
unidadesRouter.post(
  '/',
  async (
    req: Request<
      Record<string, never>,
      unknown,
      CrearUnidadBody
    >,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        numeroUnidad,
        placa,
        marca,
        modelo,
        anio,
        tipoCombustible,
        kilometrajeActual,
        intervaloMantenimientoKm,
        proximoMantenimientoKm,
        observaciones,
      } = req.body;

      if (
        !numeroUnidad?.trim() ||
        !placa?.trim() ||
        !marca?.trim() ||
        !modelo?.trim() ||
        anio === undefined ||
        !tipoCombustible ||
        kilometrajeActual === undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            'Completa todos los campos obligatorios de la unidad',
        });
        return;
      }

      const anioConvertido = Number(anio);
      const kilometrajeConvertido =
        Number(kilometrajeActual);

      const anioMaximo =
        new Date().getFullYear() + 1;

      if (
        !Number.isInteger(anioConvertido) ||
        anioConvertido < 1950 ||
        anioConvertido > anioMaximo
      ) {
        res.status(400).json({
          success: false,
          message:
            'El año de la unidad no es válido',
        });
        return;
      }

      if (
        !Number.isInteger(kilometrajeConvertido) ||
        kilometrajeConvertido < 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'El kilometraje debe ser un número entero mayor o igual a cero',
        });
        return;
      }

      if (
        tipoCombustible !== 'GASOLINA' &&
        tipoCombustible !== 'DIESEL'
      ) {
        res.status(400).json({
          success: false,
          message:
            'El tipo de combustible no es válido',
        });
        return;
      }

      const intervaloVacio =
        intervaloMantenimientoKm === undefined ||
        intervaloMantenimientoKm === null ||
        intervaloMantenimientoKm === '';

      const proximoVacio =
        proximoMantenimientoKm === undefined ||
        proximoMantenimientoKm === null ||
        proximoMantenimientoKm === '';

      if (intervaloVacio !== proximoVacio) {
        res.status(400).json({
          success: false,
          message:
            'Para configurar el plan de mantenimiento debes indicar el intervalo y el próximo kilometraje',
        });
        return;
      }

      let intervaloConvertido: number | null = null;
      let proximoConvertido: number | null = null;

      if (!intervaloVacio && !proximoVacio) {
        intervaloConvertido = Number(
          intervaloMantenimientoKm,
        );

        proximoConvertido = Number(
          proximoMantenimientoKm,
        );

        if (
          !Number.isInteger(intervaloConvertido) ||
          intervaloConvertido <= 0
        ) {
          res.status(400).json({
            success: false,
            message:
              'El intervalo de mantenimiento debe ser un número entero mayor a cero',
          });
          return;
        }

        if (
          !Number.isInteger(proximoConvertido) ||
          proximoConvertido < 0
        ) {
          res.status(400).json({
            success: false,
            message:
              'El próximo kilometraje de mantenimiento no es válido',
          });
          return;
        }
      }

      const unidad = await prisma.unidad.create({
        data: {
          numeroUnidad:
            numeroUnidad.trim().toUpperCase(),

          placa:
            placa.trim().toUpperCase(),

          marca: marca.trim(),
          modelo: modelo.trim(),
          anio: anioConvertido,
          tipoCombustible,

          kilometrajeActual:
            kilometrajeConvertido,

          intervaloMantenimientoKm:
            intervaloConvertido,

          proximoMantenimientoKm:
            proximoConvertido,

          observaciones:
            observaciones?.trim() || null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Unidad registrada con éxito',
        data: unidad,
      });
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        res.status(409).json({
          success: false,
          message:
            'Ya existe una unidad con ese número o placa',
        });
        return;
      }

      console.error(
        'Error al registrar unidad:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible registrar la unidad',
      });
    }
  },
);

// Edita la información administrativa de una unidad.
unidadesRouter.patch(
  '/:id',
  async (
    req: Request<
      { id: string },
      unknown,
      ActualizarUnidadBody
    >,
    res: Response,
  ): Promise<void> => {
    try {
      const unidadId = Number(req.params.id);

      if (
        !Number.isInteger(unidadId) ||
        unidadId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'El identificador de la unidad no es válido',
        });
        return;
      }

      const unidadExistente =
        await prisma.unidad.findUnique({
          where: {
            id: unidadId,
          },
        });

      if (!unidadExistente) {
        res.status(404).json({
          success: false,
          message: 'La unidad no existe',
        });
        return;
      }

      const {
        numeroUnidad,
        placa,
        marca,
        modelo,
        anio,
        tipoCombustible,
        intervaloMantenimientoKm,
        proximoMantenimientoKm,
        observaciones,
      } = req.body;

      if (
        numeroUnidad !== undefined &&
        !numeroUnidad.trim()
      ) {
        res.status(400).json({
          success: false,
          message:
            'El número de unidad no puede estar vacío',
        });
        return;
      }

      if (
        placa !== undefined &&
        !placa.trim()
      ) {
        res.status(400).json({
          success: false,
          message:
            'La placa no puede estar vacía',
        });
        return;
      }

      if (
        marca !== undefined &&
        !marca.trim()
      ) {
        res.status(400).json({
          success: false,
          message:
            'La marca no puede estar vacía',
        });
        return;
      }

      if (
        modelo !== undefined &&
        !modelo.trim()
      ) {
        res.status(400).json({
          success: false,
          message:
            'El modelo no puede estar vacío',
        });
        return;
      }

      let anioConvertido: number | undefined;

      if (anio !== undefined) {
        anioConvertido = Number(anio);

        const anioMaximo =
          new Date().getFullYear() + 1;

        if (
          !Number.isInteger(anioConvertido) ||
          anioConvertido < 1950 ||
          anioConvertido > anioMaximo
        ) {
          res.status(400).json({
            success: false,
            message:
              'El año de la unidad no es válido',
          });
          return;
        }
      }

      if (
        tipoCombustible !== undefined &&
        tipoCombustible !== 'GASOLINA' &&
        tipoCombustible !== 'DIESEL'
      ) {
        res.status(400).json({
          success: false,
          message:
            'El tipo de combustible no es válido',
        });
        return;
      }

      const modificarPlan =
        intervaloMantenimientoKm !== undefined ||
        proximoMantenimientoKm !== undefined;

      let intervaloConvertido:
        | number
        | null
        | undefined;

      let proximoConvertido:
        | number
        | null
        | undefined;

      if (modificarPlan) {
        const intervaloVacio =
          intervaloMantenimientoKm === null ||
          intervaloMantenimientoKm === '';

        const proximoVacio =
          proximoMantenimientoKm === null ||
          proximoMantenimientoKm === '';

        if (
          intervaloMantenimientoKm === undefined ||
          proximoMantenimientoKm === undefined
        ) {
          res.status(400).json({
            success: false,
            message:
              'Para modificar el plan de mantenimiento debes indicar el intervalo y el próximo kilometraje',
          });
          return;
        }

        if (intervaloVacio !== proximoVacio) {
          res.status(400).json({
            success: false,
            message:
              'El intervalo y el próximo kilometraje deben configurarse juntos',
          });
          return;
        }

        if (intervaloVacio && proximoVacio) {
          intervaloConvertido = null;
          proximoConvertido = null;
        } else {
          intervaloConvertido = Number(
            intervaloMantenimientoKm,
          );

          proximoConvertido = Number(
            proximoMantenimientoKm,
          );

          if (
            !Number.isInteger(intervaloConvertido) ||
            intervaloConvertido <= 0
          ) {
            res.status(400).json({
              success: false,
              message:
                'El intervalo de mantenimiento debe ser un número entero mayor a cero',
            });
            return;
          }

          if (
            !Number.isInteger(proximoConvertido) ||
            proximoConvertido < 0
          ) {
            res.status(400).json({
              success: false,
              message:
                'El próximo kilometraje de mantenimiento no es válido',
            });
            return;
          }
        }
      }

      const unidadActualizada =
        await prisma.unidad.update({
          where: {
            id: unidadId,
          },
          data: {
            ...(numeroUnidad !== undefined
              ? {
                numeroUnidad:
                  numeroUnidad
                    .trim()
                    .toUpperCase(),
              }
              : {}),

            ...(placa !== undefined
              ? {
                placa:
                  placa.trim().toUpperCase(),
              }
              : {}),

            ...(marca !== undefined
              ? {
                marca: marca.trim(),
              }
              : {}),

            ...(modelo !== undefined
              ? {
                modelo: modelo.trim(),
              }
              : {}),

            ...(anioConvertido !== undefined
              ? {
                anio: anioConvertido,
              }
              : {}),

            ...(tipoCombustible !== undefined
              ? {
                tipoCombustible,
              }
              : {}),

            ...(modificarPlan
              ? {
                intervaloMantenimientoKm:
                  intervaloConvertido,

                proximoMantenimientoKm:
                  proximoConvertido,
              }
              : {}),

            ...(observaciones !== undefined
              ? {
                observaciones:
                  observaciones.trim() || null,
              }
              : {}),
          },
        });

      res.status(200).json({
        success: true,
        message:
          'Unidad actualizada correctamente',
        data: unidadActualizada,
      });
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        res.status(409).json({
          success: false,
          message:
            'Ya existe otra unidad con ese número o placa',
        });
        return;
      }

      console.error(
        'Error al actualizar unidad:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible actualizar la unidad',
      });
    }
  },
);

// Cambia manualmente el estado operativo de una unidad.
unidadesRouter.patch(
  '/:id/estado',
  async (
    req: Request<
      { id: string },
      unknown,
      CambiarEstadoUnidadBody
    >,
    res: Response,
  ): Promise<void> => {
    try {
      const unidadId = Number(req.params.id);
      const { estado } = req.body;

      if (
        !Number.isInteger(unidadId) ||
        unidadId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'El identificador de la unidad no es válido',
        });
        return;
      }

      if (
        estado !== 'DISPONIBLE' &&
        estado !== 'EN_RUTA' &&
        estado !== 'FUERA_DE_SERVICIO'
      ) {
        res.status(400).json({
          success: false,
          message:
            'El estado seleccionado no es válido',
        });
        return;
      }

      const unidad =
        await prisma.unidad.findUnique({
          where: {
            id: unidadId,
          },
        });

      if (!unidad) {
        res.status(404).json({
          success: false,
          message:
            'La unidad no existe',
        });
        return;
      }

      // MANTENIMIENTO se controla desde su módulo específico.
      if (unidad.estado === 'MANTENIMIENTO') {
        res.status(409).json({
          success: false,
          message:
            'La unidad tiene un mantenimiento en proceso. Debes finalizarlo desde el módulo de Mantenimientos',
        });
        return;
      }

      const unidadActualizada =
        await prisma.unidad.update({
          where: {
            id: unidadId,
          },
          data: {
            estado,
          },
        });

      res.status(200).json({
        success: true,
        message:
          'Estado de la unidad actualizado correctamente',
        data: unidadActualizada,
      });
    } catch (error) {
      console.error(
        'Error al cambiar el estado de la unidad:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible cambiar el estado de la unidad',
      });
    }
  },
);