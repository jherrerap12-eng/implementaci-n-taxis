import { Router, type Request, type Response } from 'express';

import { prisma } from '../lib/prisma.js';

interface CrearRegistroDiarioBody {
  pilotoId?: number | string;
  unidadId?: number | string;
  fecha?: string;
  kilometrajeFinal?: number | string;
  montoLiquidado?: number | string;
  observaciones?: string;
}

interface RegistrarCombustibleBody {
  sinCombustible?: boolean;
  monto?: number | string;
  galones?: number | string;
  precioGalon?: number | string;
}

export const registrosDiariosRouter = Router();

// Obtiene los pilotos y unidades disponibles para una fecha.
registrosDiariosRouter.get(
  '/disponibilidad',
  async (
    req: Request<
      Record<string, never>,
      unknown,
      unknown,
      { fecha?: string }
    >,
    res: Response,
  ): Promise<void> => {
    try {
      const fechaTexto = req.query.fecha?.trim();

      if (!fechaTexto) {
        res.status(400).json({
          success: false,
          message: 'La fecha es obligatoria',
        });
        return;
      }

      const fechaRegistro = new Date(
        `${fechaTexto}T00:00:00.000Z`,
      );

      if (
        Number.isNaN(fechaRegistro.getTime()) ||
        fechaRegistro.toISOString().slice(0, 10) !==
          fechaTexto
      ) {
        res.status(400).json({
          success: false,
          message: 'La fecha ingresada no es válida',
        });
        return;
      }

      const registrosDeLaFecha =
        await prisma.registroDiario.findMany({
          where: {
            fecha: fechaRegistro,
          },
          select: {
            pilotoId: true,
            unidadId: true,
          },
        });

      const pilotosOcupados = [
        ...new Set(
          registrosDeLaFecha.map(
            (registro) => registro.pilotoId,
          ),
        ),
      ];

      const unidadesOcupadas = [
        ...new Set(
          registrosDeLaFecha.map(
            (registro) => registro.unidadId,
          ),
        ),
      ];

      const [pilotosDisponibles, unidadesDisponibles] =
        await Promise.all([
          prisma.piloto.findMany({
            where: {
              estado: 'ACTIVO',

              vencimientoLicencia: {
                gte: fechaRegistro,
              },

              ...(pilotosOcupados.length > 0
                ? {
                    id: {
                      notIn: pilotosOcupados,
                    },
                  }
                : {}),
            },
            orderBy: {
              codigo: 'asc',
            },
          }),

          prisma.unidad.findMany({
            where: {
              estado: 'DISPONIBLE',

              ...(unidadesOcupadas.length > 0
                ? {
                    id: {
                      notIn: unidadesOcupadas,
                    },
                  }
                : {}),
            },
            orderBy: {
              numeroUnidad: 'asc',
            },
          }),
        ]);

      res.status(200).json({
        success: true,
        message:
          'Disponibilidad obtenida correctamente',
        data: {
          fecha: fechaTexto,
          pilotos: pilotosDisponibles,
          unidades: unidadesDisponibles,
        },
      });
    } catch (error) {
      console.error(
        'Error al consultar la disponibilidad:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible consultar la disponibilidad',
      });
    }
  },
);

registrosDiariosRouter.get(
  '/resumen',
  async (
    req: Request<Record<string, never>, unknown, unknown, { fecha?: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const fecha = req.query.fecha;

      if (!fecha?.trim()) {
        res.status(400).json({
          success: false,
          message: 'La fecha es obligatoria',
        });
        return;
      }

      const fechaConsulta = new Date(`${fecha}T00:00:00.000Z`);

      if (Number.isNaN(fechaConsulta.getTime())) {
        res.status(400).json({
          success: false,
          message: 'La fecha ingresada no es válida',
        });
        return;
      }

      const registros = await prisma.registroDiario.findMany({
        where: {
          fecha: fechaConsulta,
        },
        include: {
          piloto: true,
          unidad: true,
          cargasCombustible: true,
        },
        orderBy: {
          creadoEn: 'asc',
        },
      });

      const totales = registros.reduce(
        (acumulado, registro) => {
          const kilometrosRecorridos =
            registro.kilometrajeFinal -
            registro.kilometrajeInicial;

          const totalCombustible =
            registro.cargasCombustible.reduce(
              (total, carga) => total + Number(carga.monto),
              0,
            );

          const totalGalones =
            registro.cargasCombustible.reduce(
              (total, carga) => total + Number(carga.galones),
              0,
            );

          acumulado.operaciones += 1;
          acumulado.kilometrosRecorridos += kilometrosRecorridos;
          acumulado.montoLiquidado += Number(registro.montoLiquidado);
          acumulado.montoCombustible += totalCombustible;
          acumulado.galones += totalGalones;

          return acumulado;
        },
        {
          operaciones: 0,
          kilometrosRecorridos: 0,
          montoLiquidado: 0,
          montoCombustible: 0,
          galones: 0,
        },
      );

      res.status(200).json({
        success: true,
        message: 'Resumen diario obtenido correctamente',
        data: {
          fecha,
          totales: {
            operaciones: totales.operaciones,
            kilometrosRecorridos: totales.kilometrosRecorridos,
            montoLiquidado: Number(
              totales.montoLiquidado.toFixed(2),
            ),
            montoCombustible: Number(
              totales.montoCombustible.toFixed(2),
            ),
            galones: Number(totales.galones.toFixed(3)),
          },
          registros,
        },
      });
    } catch (error) {
      console.error('Error al obtener el resumen diario:', error);

      res.status(500).json({
        success: false,
        message: 'No fue posible obtener el resumen diario',
      });
    }
  },
);
// Obtiene un registro diario específico por su identificador.
registrosDiariosRouter.get(
  '/:id',
  async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const registroId = Number(req.params.id);

      if (!Number.isInteger(registroId) || registroId <= 0) {
        res.status(400).json({
          success: false,
          message: 'El identificador del registro no es válido',
        });
        return;
      }

      const registro = await prisma.registroDiario.findUnique({
        where: {
          id: registroId,
        },
        include: {
          piloto: true,
          unidad: true,
          cargasCombustible: true,
        },
      });

      if (!registro) {
        res.status(404).json({
          success: false,
          message: 'El registro diario no existe',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Registro diario obtenido correctamente',
        data: registro,
      });
    } catch (error) {
      console.error(
        'Error al consultar el registro diario:',
        error,
      );

      res.status(500).json({
        success: false,
        message: 'No fue posible consultar el registro diario',
      });
    }
  },
);
// Registra la operación diaria de una unidad.
registrosDiariosRouter.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CrearRegistroDiarioBody>,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        pilotoId,
        unidadId,
        fecha,
        kilometrajeFinal,
        montoLiquidado,
        observaciones,
      } = req.body;

      if (
        pilotoId === undefined ||
        unidadId === undefined ||
        !fecha?.trim() ||
        kilometrajeFinal === undefined ||
        montoLiquidado === undefined
      ) {
        res.status(400).json({
          success: false,
          message: 'Completa todos los campos obligatorios',
        });
        return;
      }

      const pilotoIdConvertido = Number(pilotoId);
      const unidadIdConvertido = Number(unidadId);
      const kilometrajeFinalConvertido = Number(kilometrajeFinal);
      const montoLiquidadoConvertido = Number(montoLiquidado);

      if (
        !Number.isInteger(pilotoIdConvertido) ||
        !Number.isInteger(unidadIdConvertido)
      ) {
        res.status(400).json({
          success: false,
          message: 'El piloto o la unidad seleccionada no son válidos',
        });
        return;
      }

      if (
        !Number.isInteger(kilometrajeFinalConvertido) ||
        kilometrajeFinalConvertido < 0
      ) {
        res.status(400).json({
          success: false,
          message: 'El kilometraje final debe ser un número entero válido',
        });
        return;
      }

      if (
        !Number.isFinite(montoLiquidadoConvertido) ||
        montoLiquidadoConvertido < 0
      ) {
        res.status(400).json({
          success: false,
          message: 'El monto liquidado debe ser un número válido',
        });
        return;
      }

      const fechaRegistro = new Date(`${fecha}T00:00:00.000Z`);

      if (Number.isNaN(fechaRegistro.getTime())) {
        res.status(400).json({
          success: false,
          message: 'La fecha ingresada no es válida',
        });
        return;
      }

      const [piloto, unidad] = await Promise.all([
        prisma.piloto.findUnique({
          where: {
            id: pilotoIdConvertido,
          },
        }),

        prisma.unidad.findUnique({
          where: {
            id: unidadIdConvertido,
          },
        }),
      ]);

      if (!piloto) {
        res.status(404).json({
          success: false,
          message: 'El piloto seleccionado no existe',
        });
        return;
      }

      if (!unidad) {
        res.status(404).json({
          success: false,
          message: 'La unidad seleccionada no existe',
        });
        return;
      }

      if (piloto.estado !== 'ACTIVO') {
        res.status(400).json({
          success: false,
          message: 'El piloto seleccionado se encuentra inactivo',
        });
        return;
      }
      if (piloto.vencimientoLicencia < fechaRegistro) {
  res.status(400).json({
    success: false,
    message:
      'El piloto seleccionado tiene la licencia vencida para esta fecha',
  });
  return;
}

      if (unidad.estado !== 'DISPONIBLE') {
        res.status(400).json({
          success: false,
          message: 'La unidad seleccionada no está disponible',
        });
        return;
      }
      const [registroDelPiloto, registroDeLaUnidad] =
  await Promise.all([
    prisma.registroDiario.findFirst({
      where: {
        pilotoId: pilotoIdConvertido,
        fecha: fechaRegistro,
      },
      select: {
        id: true,
      },
    }),

    prisma.registroDiario.findFirst({
      where: {
        unidadId: unidadIdConvertido,
        fecha: fechaRegistro,
      },
      select: {
        id: true,
      },
    }),
  ]);

if (registroDelPiloto && registroDeLaUnidad) {
  res.status(409).json({
    success: false,
    message:
      'El piloto y la unidad ya tienen una operación registrada en esta fecha',
  });
  return;
}

if (registroDelPiloto) {
  res.status(409).json({
    success: false,
    message:
      'El piloto seleccionado ya tiene una operación registrada en esta fecha',
  });
  return;
}

if (registroDeLaUnidad) {
  res.status(409).json({
    success: false,
    message:
      'La unidad seleccionada ya tiene una operación registrada en esta fecha',
  });
  return;
}

      const kilometrajeInicial = unidad.kilometrajeActual;

      if (kilometrajeFinalConvertido < kilometrajeInicial) {
        res.status(400).json({
          success: false,
          message:
            'El kilometraje final no puede ser menor al kilometraje actual de la unidad',
        });
        return;
      }

      const registro = await prisma.$transaction(async (transaccion) => {
        const nuevoRegistro = await transaccion.registroDiario.create({
          data: {
            pilotoId: pilotoIdConvertido,
            unidadId: unidadIdConvertido,
            fecha: fechaRegistro,
            kilometrajeInicial,
            kilometrajeFinal: kilometrajeFinalConvertido,
            montoLiquidado: montoLiquidadoConvertido.toFixed(2),
            observaciones: observaciones?.trim() || null,
          },
          include: {
            piloto: true,
            unidad: true,
          },
        });

        await transaccion.unidad.update({
          where: {
            id: unidadIdConvertido,
          },
          data: {
            kilometrajeActual: kilometrajeFinalConvertido,
          },
        });

        return nuevoRegistro;
      });

      res.status(201).json({
        success: true,
        message:
          'Registro diario guardado. Continúa con el registro de combustible',
        data: registro,
      });
    } catch (error) {
      console.error('Error al registrar la operación diaria:', error);

      res.status(500).json({
        success: false,
        message: 'No fue posible guardar el registro diario',
      });
    }
  },
  
);
// Registra el combustible y completa la operación diaria.
registrosDiariosRouter.post(
  '/:id/combustible',
  async (
    req: Request<
      { id: string },
      unknown,
      RegistrarCombustibleBody
    >,
    res: Response,
  ): Promise<void> => {
    try {
      const registroId = Number(req.params.id);

      if (!Number.isInteger(registroId) || registroId <= 0) {
        res.status(400).json({
          success: false,
          message: 'El identificador del registro no es válido',
        });
        return;
      }

      const registroExistente =
        await prisma.registroDiario.findUnique({
          where: {
            id: registroId,
          },
        });

      if (!registroExistente) {
        res.status(404).json({
          success: false,
          message: 'El registro diario no existe',
        });
        return;
      }

      if (registroExistente.estado === 'COMPLETADO') {
        res.status(409).json({
          success: false,
          message: 'Este registro diario ya fue completado',
        });
        return;
      }

      const {
        sinCombustible = false,
        monto,
        galones,
        precioGalon,
      } = req.body;

      // Permite completar el registro cuando la unidad no cargó combustible.
      if (sinCombustible) {
        const registroActualizado =
          await prisma.registroDiario.update({
            where: {
              id: registroId,
            },
            data: {
              estado: 'COMPLETADO',
            },
            include: {
              piloto: true,
              unidad: true,
              cargasCombustible: true,
            },
          });

        res.status(200).json({
          success: true,
          message:
            'Operación completada sin carga de combustible',
          data: {
            registro: registroActualizado,
            carga: null,
          },
        });

        return;
      }

      if (
        monto === undefined ||
        galones === undefined ||
        precioGalon === undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            'Monto, galones y precio por galón son obligatorios',
        });
        return;
      }

      const montoConvertido = Number(monto);
      const galonesConvertidos = Number(galones);
      const precioGalonConvertido = Number(precioGalon);

      if (
        !Number.isFinite(montoConvertido) ||
        montoConvertido <= 0 ||
        !Number.isFinite(galonesConvertidos) ||
        galonesConvertidos <= 0 ||
        !Number.isFinite(precioGalonConvertido) ||
        precioGalonConvertido <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'Los valores de combustible deben ser mayores que cero',
        });
        return;
      }

      const montoCalculado =
        galonesConvertidos * precioGalonConvertido;

      if (Math.abs(montoConvertido - montoCalculado) > 0.05) {
        res.status(400).json({
          success: false,
          message:
            'El monto no coincide con los galones y el precio por galón',
        });
        return;
      }

      const resultado = await prisma.$transaction(
        async (transaccion) => {
          const carga =
            await transaccion.cargaCombustible.create({
              data: {
                registroDiarioId: registroId,
                monto: montoConvertido.toFixed(2),
                galones: galonesConvertidos.toFixed(3),
                precioGalon:
                  precioGalonConvertido.toFixed(2),
              },
            });

          const registroActualizado =
            await transaccion.registroDiario.update({
              where: {
                id: registroId,
              },
              data: {
                estado: 'COMPLETADO',
              },
              include: {
                piloto: true,
                unidad: true,
                cargasCombustible: true,
              },
            });

          return {
            registro: registroActualizado,
            carga,
          };
        },
      );

      res.status(201).json({
        success: true,
        message:
          'Combustible registrado y operación completada',
        data: resultado,
      });
    } catch (error) {
      console.error(
        'Error al registrar el combustible:',
        error,
      );

     res.status(500).json({
      success: false,
      message:
        'No fue posible registrar el combustible',
    });
  }
},
);