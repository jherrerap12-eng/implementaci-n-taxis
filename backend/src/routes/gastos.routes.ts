import {
  Router,
  type Request,
  type Response,
} from 'express';

import { prisma } from '../lib/prisma.js';

interface CrearGastoBody {
  unidadId?: number | string;
  fecha?: string;
  tipo?:
    | 'REPUESTOS_MENORES'
    | 'PINCHAZO';
  descripcion?: string;
  monto?: number | string;
}

export const gastosRouter = Router();

// Obtiene todos los gastos registrados.
gastosRouter.get(
  '/',
  async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const gastos = await prisma.gasto.findMany({
        include: {
          unidad: true,
        },
        orderBy: [
          {
            fecha: 'desc',
          },
          {
            creadoEn: 'desc',
          },
        ],
      });

      res.status(200).json({
        success: true,
        message:
          'Gastos obtenidos correctamente',
        data: gastos,
      });
    } catch (error) {
      console.error(
        'Error al consultar gastos:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible consultar los gastos',
      });
    }
  },
);

// Registra un gasto de una unidad.
gastosRouter.post(
  '/',
  async (
    req: Request<
      Record<string, never>,
      unknown,
      CrearGastoBody
    >,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        unidadId,
        fecha,
        tipo,
        descripcion,
        monto,
      } = req.body;

      if (
        unidadId === undefined ||
        !fecha?.trim() ||
        !tipo ||
        monto === undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            'Completa todos los campos obligatorios del gasto',
        });
        return;
      }

      const unidadIdConvertido =
        Number(unidadId);

      const montoConvertido =
        Number(monto);

      if (
        !Number.isInteger(
          unidadIdConvertido,
        ) ||
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
        tipo !== 'REPUESTOS_MENORES' &&
        tipo !== 'PINCHAZO'
      ) {
        res.status(400).json({
          success: false,
          message:
            'El tipo de gasto no es válido',
        });
        return;
      }

      if (
        !Number.isFinite(montoConvertido) ||
        montoConvertido <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'El monto debe ser mayor a cero',
        });
        return;
      }

      const fechaConvertida = new Date(
        `${fecha}T00:00:00.000Z`,
      );

      if (
        Number.isNaN(
          fechaConvertida.getTime(),
        ) ||
        fechaConvertida
          .toISOString()
          .slice(0, 10) !== fecha
      ) {
        res.status(400).json({
          success: false,
          message:
            'La fecha del gasto no es válida',
        });
        return;
      }

      const ahora = new Date();

      const diferenciaZonaHoraria =
        ahora.getTimezoneOffset() * 60_000;

      const fechaActualTexto = new Date(
        ahora.getTime() -
          diferenciaZonaHoraria,
      )
        .toISOString()
        .slice(0, 10);

      const fechaActual = new Date(
        `${fechaActualTexto}T00:00:00.000Z`,
      );

      if (fechaConvertida > fechaActual) {
        res.status(400).json({
          success: false,
          message:
            'La fecha del gasto no puede ser futura',
        });
        return;
      }

      const unidad =
        await prisma.unidad.findUnique({
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

      const gasto =
        await prisma.gasto.create({
          data: {
            unidadId:
              unidadIdConvertido,

            fecha:
              fechaConvertida,

            tipo,

            descripcion:
              descripcion?.trim() || null,

            monto:
              montoConvertido.toFixed(2),
          },
          include: {
            unidad: true,
          },
        });

      res.status(201).json({
        success: true,
        message:
          'Gasto registrado correctamente',
        data: gasto,
      });
    } catch (error) {
      console.error(
        'Error al registrar gasto:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible registrar el gasto',
      });
    }
  },
);