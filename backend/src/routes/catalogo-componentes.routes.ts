import { Router, type Request, type Response } from 'express';

import { Prisma } from '../generated/prisma/client.js';
import {
  actualizarCatalogoComponenteSchema,
  cambiarEstadoCatalogoComponenteSchema,
  crearCatalogoComponenteSchema,
} from '../schemas/catalogo-componentes.schemas.js';
import {
  actualizarCatalogoComponente,
  cambiarEstadoCatalogoComponente,
  crearCatalogoComponente,
  ErrorCatalogoComponentes,
  listarCatalogoComponentes,
  obtenerCatalogoComponente,
} from '../services/catalogo-componentes.service.js';

export const catalogoComponentesRouter = Router();

function obtenerId(id: string, res: Response): number | null {
  const componenteId = Number(id);

  if (!Number.isInteger(componenteId) || componenteId <= 0) {
    res.status(400).json({
      success: false,
      message: 'El identificador del componente no es válido',
    });
    return null;
  }

  return componenteId;
}

function manejarError(error: unknown, res: Response): void {
  if (error instanceof ErrorCatalogoComponentes) {
    res.status(error.status).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    res.status(409).json({
      success: false,
      message: 'Ya existe un componente con ese nombre',
    });
    return;
  }

  console.error('Error al administrar el catálogo de componentes:', error);
  res.status(500).json({
    success: false,
    message: 'No fue posible procesar el catálogo de componentes',
  });
}

catalogoComponentesRouter.get('/', async (_req, res): Promise<void> => {
  try {
    const componentes = await listarCatalogoComponentes();
    res.status(200).json({
      success: true,
      message: 'Catálogo de componentes obtenido correctamente',
      data: componentes,
    });
  } catch (error) {
    manejarError(error, res);
  }
});

catalogoComponentesRouter.get(
  '/:id',
  async (req: Request<{ id: string }>, res): Promise<void> => {
    const componenteId = obtenerId(req.params.id, res);
    if (componenteId === null) return;

    try {
      const componente = await obtenerCatalogoComponente(componenteId);
      res.status(200).json({
        success: true,
        message: 'Componente obtenido correctamente',
        data: componente,
      });
    } catch (error) {
      manejarError(error, res);
    }
  },
);

catalogoComponentesRouter.post('/', async (req, res): Promise<void> => {
  const validacion = crearCatalogoComponenteSchema.safeParse(req.body);
  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: validacion.error.issues[0]?.message ?? 'Datos no válidos',
    });
    return;
  }

  try {
    const componente = await crearCatalogoComponente(validacion.data);
    res.status(201).json({
      success: true,
      message: 'Componente creado correctamente',
      data: componente,
    });
  } catch (error) {
    manejarError(error, res);
  }
});

catalogoComponentesRouter.patch(
  '/:id',
  async (req: Request<{ id: string }>, res): Promise<void> => {
    const componenteId = obtenerId(req.params.id, res);
    if (componenteId === null) return;

    const validacion = actualizarCatalogoComponenteSchema.safeParse(req.body);
    if (!validacion.success) {
      res.status(400).json({
        success: false,
        message: validacion.error.issues[0]?.message ?? 'Datos no válidos',
      });
      return;
    }

    try {
      const componente = await actualizarCatalogoComponente(
        componenteId,
        validacion.data,
      );
      res.status(200).json({
        success: true,
        message: 'Componente actualizado correctamente',
        data: componente,
      });
    } catch (error) {
      manejarError(error, res);
    }
  },
);

catalogoComponentesRouter.patch(
  '/:id/estado',
  async (req: Request<{ id: string }>, res): Promise<void> => {
    const componenteId = obtenerId(req.params.id, res);
    if (componenteId === null) return;

    const validacion = cambiarEstadoCatalogoComponenteSchema.safeParse(
      req.body,
    );
    if (!validacion.success) {
      res.status(400).json({
        success: false,
        message: 'El estado indicado no es válido',
      });
      return;
    }

    try {
      const componente = await cambiarEstadoCatalogoComponente(
        componenteId,
        validacion.data.activo,
      );
      res.status(200).json({
        success: true,
        message: 'Estado actualizado correctamente',
        data: componente,
      });
    } catch (error) {
      manejarError(error, res);
    }
  },
);
