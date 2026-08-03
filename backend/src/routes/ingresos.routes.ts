import { Router, type Request, type Response } from 'express';

import { prisma } from '../lib/prisma.js';

interface ConsultaIngresosQuery {
  dias?: string;
  fechaFin?: string;
}

interface TotalesIngresos {
  operaciones: number;
  kilometrosRecorridos: number;
  montoLiquidado: number;
  montoCombustible: number;
  galones: number;
}

interface ResumenPorDia extends TotalesIngresos {
  fecha: string;
}

interface ResumenPorUnidad extends TotalesIngresos {
  unidadId: number;
  numeroUnidad: string;
  placa: string;
}

interface ResumenPorPiloto extends TotalesIngresos {
  pilotoId: number;
  codigo: string;
  nombreCompleto: string;
}

export const ingresosRouter = Router();

function crearTotalesVacios(): TotalesIngresos {
  return {
    operaciones: 0,
    kilometrosRecorridos: 0,
    montoLiquidado: 0,
    montoCombustible: 0,
    galones: 0,
  };
}

function sumarTotales(
  destino: TotalesIngresos,
  valores: TotalesIngresos,
): void {
  destino.operaciones += valores.operaciones;
  destino.kilometrosRecorridos += valores.kilometrosRecorridos;
  destino.montoLiquidado += valores.montoLiquidado;
  destino.montoCombustible += valores.montoCombustible;
  destino.galones += valores.galones;
}

// Obtiene los ingresos de hoy o de los últimos 7, 15 o 30 días.
ingresosRouter.get(
  '/',
  async (
    req: Request<
      Record<string, never>,
      unknown,
      unknown,
      ConsultaIngresosQuery
    >,
    res: Response,
  ): Promise<void> => {
    try {
      const dias = Number(req.query.dias ?? '1');
      const periodosPermitidos = [1, 7, 15, 30];

      if (!periodosPermitidos.includes(dias)) {
        res.status(400).json({
          success: false,
          message:
            'El período debe ser de 1, 7, 15 o 30 días',
        });
        return;
      }

      const fechaFinTexto =
        req.query.fechaFin?.trim() ||
        new Date().toISOString().slice(0, 10);

      const fechaFin = new Date(
        `${fechaFinTexto}T00:00:00.000Z`,
      );

      if (
        Number.isNaN(fechaFin.getTime()) ||
        fechaFin.toISOString().slice(0, 10) !== fechaFinTexto
      ) {
        res.status(400).json({
          success: false,
          message: 'La fecha final no es válida',
        });
        return;
      }

      const fechaInicio = new Date(fechaFin);
      fechaInicio.setUTCDate(
        fechaInicio.getUTCDate() - (dias - 1),
      );

      const fechaFinExclusiva = new Date(fechaFin);
      fechaFinExclusiva.setUTCDate(
        fechaFinExclusiva.getUTCDate() + 1,
      );

      const registros =
        await prisma.registroDiario.findMany({
          where: {
            fecha: {
              gte: fechaInicio,
              lt: fechaFinExclusiva,
            },
          },
          include: {
            piloto: true,
            unidad: true,
            cargasCombustible: true,
          },
          orderBy: [
            {
              fecha: 'asc',
            },
            {
              creadoEn: 'asc',
            },
          ],
        });

      const totales = crearTotalesVacios();

      const mapaDias = new Map<string, ResumenPorDia>();
      const mapaUnidades =
        new Map<number, ResumenPorUnidad>();
      const mapaPilotos =
        new Map<number, ResumenPorPiloto>();

      for (const registro of registros) {
        const montoCombustible =
          registro.cargasCombustible.reduce(
            (total, carga) => total + Number(carga.monto),
            0,
          );

        const galones =
          registro.cargasCombustible.reduce(
            (total, carga) => total + Number(carga.galones),
            0,
          );

        const valoresRegistro: TotalesIngresos = {
          operaciones: 1,
          kilometrosRecorridos:
            registro.kilometrajeFinal -
            registro.kilometrajeInicial,
          montoLiquidado: Number(
            registro.montoLiquidado,
          ),
          montoCombustible,
          galones,
        };

        sumarTotales(totales, valoresRegistro);

        const fechaRegistro =
          registro.fecha.toISOString().slice(0, 10);

        const resumenDia =
          mapaDias.get(fechaRegistro) ?? {
            fecha: fechaRegistro,
            ...crearTotalesVacios(),
          };

        sumarTotales(resumenDia, valoresRegistro);
        mapaDias.set(fechaRegistro, resumenDia);

        const resumenUnidad =
          mapaUnidades.get(registro.unidadId) ?? {
            unidadId: registro.unidad.id,
            numeroUnidad: registro.unidad.numeroUnidad,
            placa: registro.unidad.placa,
            ...crearTotalesVacios(),
          };

        sumarTotales(resumenUnidad, valoresRegistro);
        mapaUnidades.set(
          registro.unidadId,
          resumenUnidad,
        );

        const resumenPiloto =
          mapaPilotos.get(registro.pilotoId) ?? {
            pilotoId: registro.piloto.id,
            codigo: registro.piloto.codigo,
            nombreCompleto:
              registro.piloto.nombreCompleto,
            ...crearTotalesVacios(),
          };

        sumarTotales(resumenPiloto, valoresRegistro);
        mapaPilotos.set(
          registro.pilotoId,
          resumenPiloto,
        );
      }

      res.status(200).json({
        success: true,
        message: 'Información de ingresos obtenida correctamente',
        data: {
          periodo: {
            dias,
            fechaInicio:
              fechaInicio.toISOString().slice(0, 10),
            fechaFin: fechaFinTexto,
          },

          totales: {
            operaciones: totales.operaciones,
            kilometrosRecorridos:
              totales.kilometrosRecorridos,
            montoLiquidado: Number(
              totales.montoLiquidado.toFixed(2),
            ),
            montoCombustible: Number(
              totales.montoCombustible.toFixed(2),
            ),
            galones: Number(
              totales.galones.toFixed(3),
            ),
          },

          porDia: Array.from(mapaDias.values()),
          porUnidad: Array.from(
            mapaUnidades.values(),
          ).sort((a, b) =>
            a.numeroUnidad.localeCompare(b.numeroUnidad),
          ),
          porPiloto: Array.from(
            mapaPilotos.values(),
          ).sort((a, b) =>
            a.nombreCompleto.localeCompare(
              b.nombreCompleto,
            ),
          ),
        },
      });
    } catch (error) {
      console.error(
        'Error al obtener la información de ingresos:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible obtener la información de ingresos',
      });
    }
  },
);