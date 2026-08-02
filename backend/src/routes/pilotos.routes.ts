import { Router, type Request, type Response } from 'express';

import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

interface CrearPilotoBody {
  codigo?: string;
  nombreCompleto?: string;
  telefono?: string;
  numeroLicencia?: string;
  vencimientoLicencia?: string;
  observaciones?: string;
}

export const pilotosRouter = Router();

// Obtiene todos los pilotos registrados.
pilotosRouter.get(
  '/',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const pilotos = await prisma.piloto.findMany({
        orderBy: {
          nombreCompleto: 'asc',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Pilotos obtenidos correctamente',
        data: pilotos,
      });
    } catch (error) {
      console.error('Error al consultar pilotos:', error);

      res.status(500).json({
        success: false,
        message: 'No fue posible consultar los pilotos',
      });
    }
  },
);

// Registra un nuevo piloto.
pilotosRouter.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CrearPilotoBody>,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        codigo,
        nombreCompleto,
        telefono,
        numeroLicencia,
        vencimientoLicencia,
        observaciones,
      } = req.body;

      // Verifica los campos obligatorios.
      if (
        !codigo?.trim() ||
        !nombreCompleto?.trim() ||
        !numeroLicencia?.trim() ||
        !vencimientoLicencia?.trim()
      ) {
        res.status(400).json({
          success: false,
          message:
            'Código, nombre, número de licencia y vencimiento son obligatorios',
        });
        return;
      }

      const fechaVencimiento = new Date(
        `${vencimientoLicencia}T00:00:00.000Z`,
      );

      if (Number.isNaN(fechaVencimiento.getTime())) {
        res.status(400).json({
          success: false,
          message: 'La fecha de vencimiento no es válida',
        });
        return;
      }

      const piloto = await prisma.piloto.create({
        data: {
          codigo: codigo.trim().toUpperCase(),
          nombreCompleto: nombreCompleto.trim(),
          telefono: telefono?.trim() || null,
          numeroLicencia: numeroLicencia.trim().toUpperCase(),
          vencimientoLicencia: fechaVencimiento,
          observaciones: observaciones?.trim() || null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Piloto registrado con éxito',
        data: piloto,
      });
    } catch (error) {
      // El código y la licencia están configurados como únicos.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        res.status(409).json({
          success: false,
          message:
            'Ya existe un piloto con ese código o número de licencia',
        });
        return;
      }

      console.error('Error al registrar piloto:', error);

      res.status(500).json({
        success: false,
        message: 'No fue posible registrar el piloto',
      });
    }
  },
);