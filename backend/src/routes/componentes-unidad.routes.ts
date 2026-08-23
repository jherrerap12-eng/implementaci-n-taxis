import { Router, type Request, type Response } from 'express';

import { Prisma } from '../generated/prisma/client.js';
import {
  instalarComponenteSchema,
  reemplazarComponenteSchema,
  retirarComponenteSchema,
} from '../schemas/componentes-unidad.schemas.js';
import {
  ErrorComponentesUnidad,
  instalarComponente,
  listarComponentesUnidad,
  reemplazarComponente,
  retirarComponente,
} from '../services/componentes-unidad.service.js';

export const componentesUnidadRouter = Router();

function manejarError(error: unknown, res: Response): void {
  if (error instanceof ErrorComponentesUnidad) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    res.status(409).json({
      success: false,
      message:
        'Ya existe un componente instalado del mismo tipo y posición en la unidad',
    });
    return;
  }

  console.error('Error al administrar componentes instalados:', error);
  res.status(500).json({
    success: false,
    message: 'No fue posible procesar los componentes instalados',
  });
}

componentesUnidadRouter.get('/', async (_req, res): Promise<void> => {
  try {
    const componentes = await listarComponentesUnidad();
    res.status(200).json({
      success: true,
      message: 'Componentes instalados obtenidos correctamente',
      data: componentes,
    });
  } catch (error) {
    manejarError(error, res);
  }
});

componentesUnidadRouter.post('/', async (req, res): Promise<void> => {
  const validacion = instalarComponenteSchema.safeParse(req.body);
  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: validacion.error.issues[0]?.message ?? 'Datos no válidos',
    });
    return;
  }

  try {
    const componente = await instalarComponente(validacion.data);
    res.status(201).json({
      success: true,
      message: 'Componente instalado correctamente',
      data: componente,
    });
  } catch (error) {
    manejarError(error, res);
  }
});

componentesUnidadRouter.patch(
  '/:id/retirar',
  async (req: Request<{ id: string }>, res): Promise<void> => {
    const componenteId = Number(req.params.id);
    if (!Number.isInteger(componenteId) || componenteId <= 0) {
      res.status(400).json({
        success: false,
        message: 'El identificador del componente no es válido',
      });
      return;
    }

    const validacion = retirarComponenteSchema.safeParse(req.body);
    if (!validacion.success) {
      res.status(400).json({
        success: false,
        message: validacion.error.issues[0]?.message ?? 'Datos no válidos',
      });
      return;
    }

    try {
      const componente = await retirarComponente(
        componenteId,
        validacion.data,
      );
      res.status(200).json({
        success: true,
        message: 'Componente retirado correctamente',
        data: componente,
      });
    } catch (error) {
      manejarError(error, res);
    }
  },
);

componentesUnidadRouter.post(
  '/:id/reemplazar',
  async (req: Request<{ id: string }>, res): Promise<void> => {
    const componenteId = Number(req.params.id);
    if (!Number.isInteger(componenteId) || componenteId <= 0) {
      res.status(400).json({
        success: false,
        message: 'El identificador del componente no es válido',
      });
      return;
    }

    const validacion = reemplazarComponenteSchema.safeParse(req.body);
    if (!validacion.success) {
      res.status(400).json({
        success: false,
        message: validacion.error.issues[0]?.message ?? 'Datos no válidos',
      });
      return;
    }

    try {
      const resultado = await reemplazarComponente(
        componenteId,
        validacion.data,
      );
      res.status(201).json({
        success: true,
        message: 'Componente reemplazado correctamente',
        data: resultado,
      });
    } catch (error) {
      manejarError(error, res);
    }
  },
);
