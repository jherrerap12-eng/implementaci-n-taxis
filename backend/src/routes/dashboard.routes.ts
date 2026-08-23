import { Router, type Request, type Response } from 'express';

import { prisma } from '../lib/prisma.js';
import { obtenerAlertasComponentes } from '../services/alertas-componentes.service.js';

export const dashboardRouter = Router();

function obtenerFechaActual(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

dashboardRouter.get(
  '/',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const fechaTexto = obtenerFechaActual();
      const fechaInicio = new Date(`${fechaTexto}T00:00:00.000Z`);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setUTCDate(fechaFin.getUTCDate() + 1);

      const [
        registros,
        mantenimientos,
        gastos,
        unidadesAlertas,
        alertasComponentes,
      ] =
        await Promise.all([
          prisma.registroDiario.findMany({
            where: {
              fecha: {
                gte: fechaInicio,
                lt: fechaFin,
              },
            },
            select: {
              unidadId: true,
              kilometrajeInicial: true,
              kilometrajeFinal: true,
              montoLiquidado: true,
              estado: true,
              cargaCombustible: {
                select: {
                  monto: true,
                  galones: true,
                },
              },
              unidad: {
                select: {
                  numeroUnidad: true,
                  placa: true,
                },
              },
            },
          }),
          prisma.mantenimiento.findMany({
            where: {
              fechaInicio: {
                gte: fechaInicio,
                lt: fechaFin,
              },
            },
            select: {
              costo: true,
            },
          }),
          prisma.gasto.findMany({
            where: {
              fecha: {
                gte: fechaInicio,
                lt: fechaFin,
              },
            },
            select: {
              tipo: true,
              monto: true,
            },
          }),
          prisma.unidad.findMany({
            where: {
              proximoMantenimientoKm: {
                not: null,
              },
            },
            select: {
              id: true,
              numeroUnidad: true,
              placa: true,
              marca: true,
              modelo: true,
              kilometrajeActual: true,
              proximoMantenimientoKm: true,
            },
            orderBy: {
              numeroUnidad: 'asc',
            },
          }),
          obtenerAlertasComponentes(fechaInicio),
        ]);

      const montoLiquidado = registros.reduce(
        (total, registro) => total + Number(registro.montoLiquidado),
        0,
      );
      const montoCombustible = registros.reduce(
        (total, registro) =>
          total + Number(registro.cargaCombustible?.monto ?? 0),
        0,
      );
      const galones = registros.reduce(
        (total, registro) =>
          total + Number(registro.cargaCombustible?.galones ?? 0),
        0,
      );
      const montoMantenimientos = mantenimientos.reduce(
        (total, mantenimiento) => total + Number(mantenimiento.costo),
        0,
      );
      const montoRepuestosMenores = gastos
        .filter((gasto) => gasto.tipo === 'REPUESTOS_MENORES')
        .reduce((total, gasto) => total + Number(gasto.monto), 0);
      const montoPinchazos = gastos
        .filter((gasto) => gasto.tipo === 'PINCHAZO')
        .reduce((total, gasto) => total + Number(gasto.monto), 0);
      const montoGastosUnidades =
        montoRepuestosMenores + montoPinchazos;
      const gastosTotales =
        montoCombustible + montoMantenimientos + montoGastosUnidades;

      const unidadesOcupadas = [
        ...new Set(registros.map((registro) => registro.unidadId)),
      ];
      const unidadesDisponibles = await prisma.unidad.count({
        where: {
          estado: 'DISPONIBLE',
          ...(unidadesOcupadas.length > 0
            ? { id: { notIn: unidadesOcupadas } }
            : {}),
        },
      });

      const porUnidad = Array.from(
        registros.reduce((resumen, registro) => {
          const actual = resumen.get(registro.unidadId) ?? {
            unidadId: registro.unidadId,
            numeroUnidad: registro.unidad.numeroUnidad,
            placa: registro.unidad.placa,
            operaciones: 0,
            kilometrosRecorridos: 0,
            montoLiquidado: 0,
            montoCombustible: 0,
            galones: 0,
          };

          actual.operaciones += 1;
          actual.kilometrosRecorridos +=
            registro.kilometrajeFinal - registro.kilometrajeInicial;
          actual.montoLiquidado += Number(registro.montoLiquidado);
          actual.montoCombustible += Number(
            registro.cargaCombustible?.monto ?? 0,
          );
          actual.galones += Number(
            registro.cargaCombustible?.galones ?? 0,
          );
          resumen.set(registro.unidadId, actual);
          return resumen;
        }, new Map<number, {
          unidadId: number;
          numeroUnidad: string;
          placa: string;
          operaciones: number;
          kilometrosRecorridos: number;
          montoLiquidado: number;
          montoCombustible: number;
          galones: number;
        }>()).values(),
      ).sort((a, b) => a.numeroUnidad.localeCompare(b.numeroUnidad));

      const mantenimientosRequeridos = unidadesAlertas.filter(
        (unidad) =>
          unidad.proximoMantenimientoKm !== null &&
          unidad.kilometrajeActual >= unidad.proximoMantenimientoKm,
      );
      const proximosMantenimientos = unidadesAlertas.filter((unidad) => {
        if (unidad.proximoMantenimientoKm === null) return false;
        const restantes =
          unidad.proximoMantenimientoKm - unidad.kilometrajeActual;
        return restantes > 0 && restantes <= 500;
      });

      res.status(200).json({
        success: true,
        message: 'Dashboard obtenido correctamente',
        data: {
          fecha: fechaTexto,
          totales: {
            operaciones: registros.length,
            kilometrosRecorridos: registros.reduce(
              (total, registro) =>
                total +
                registro.kilometrajeFinal -
                registro.kilometrajeInicial,
              0,
            ),
            montoLiquidado: Number(montoLiquidado.toFixed(2)),
            montoCombustible: Number(montoCombustible.toFixed(2)),
            montoMantenimientos: Number(montoMantenimientos.toFixed(2)),
            montoRepuestosMenores: Number(
              montoRepuestosMenores.toFixed(2),
            ),
            montoPinchazos: Number(montoPinchazos.toFixed(2)),
            montoGastosUnidades: Number(montoGastosUnidades.toFixed(2)),
            gastosTotales: Number(gastosTotales.toFixed(2)),
            utilidadOperativa: Number(
              (montoLiquidado - gastosTotales).toFixed(2),
            ),
            galones: Number(galones.toFixed(3)),
            pendientesCombustible: registros.filter(
              (registro) => registro.estado === 'PENDIENTE_COMBUSTIBLE',
            ).length,
            unidadesDisponibles,
          },
          porUnidad,
          alertasMantenimiento: {
            requeridas: mantenimientosRequeridos,
            proximas: proximosMantenimientos,
          },
          alertasComponentes,
        },
      });
    } catch (error) {
      console.error('Error al obtener el dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'No fue posible obtener el dashboard',
      });
    }
  },
);
