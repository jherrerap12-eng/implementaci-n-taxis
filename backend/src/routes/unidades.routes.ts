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
  observaciones?: string;
}

export const unidadesRouter = Router();

// Obtiene todas las unidades registradas.
unidadesRouter.get(
  '/',
  async (_req: Request, res: Response): Promise<void> => {
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
      console.error('Error al consultar unidades:', error);

      res.status(500).json({
        success: false,
        message: 'No fue posible consultar las unidades',
      });
    }
  },
);

// Registra una nueva unidad.
unidadesRouter.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CrearUnidadBody>,
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
          message: 'Completa todos los campos obligatorios de la unidad',
        });
        return;
      }

      const anioConvertido = Number(anio);
      const kilometrajeConvertido = Number(kilometrajeActual);
      const anioMaximo = new Date().getFullYear() + 1;

      if (
        !Number.isInteger(anioConvertido) ||
        anioConvertido < 1950 ||
        anioConvertido > anioMaximo
      ) {
        res.status(400).json({
          success: false,
          message: 'El año de la unidad no es válido',
        });
        return;
      }

      if (
        !Number.isInteger(kilometrajeConvertido) ||
        kilometrajeConvertido < 0
      ) {
        res.status(400).json({
          success: false,
          message: 'El kilometraje debe ser un número entero mayor o igual a cero',
        });
        return;
      }

      if (
        tipoCombustible !== 'GASOLINA' &&
        tipoCombustible !== 'DIESEL'
      ) {
        res.status(400).json({
          success: false,
          message: 'El tipo de combustible no es válido',
        });
        return;
      }

      const unidad = await prisma.unidad.create({
        data: {
          numeroUnidad: numeroUnidad.trim().toUpperCase(),
          placa: placa.trim().toUpperCase(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          anio: anioConvertido,
          tipoCombustible,
          kilometrajeActual: kilometrajeConvertido,
          observaciones: observaciones?.trim() || null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Unidad registrada con éxito',
        data: unidad,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        res.status(409).json({
          success: false,
          message: 'Ya existe una unidad con ese número o placa',
        });
        return;
      }

      console.error('Error al registrar unidad:', error);

      res.status(500).json({
        success: false,
        message: 'No fue posible registrar la unidad',
      });
    }
  },
);