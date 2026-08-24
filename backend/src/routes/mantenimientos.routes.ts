import { Router, type Request, type Response } from 'express';
import { crearMantenimientoSchema, finalizarMantenimientoSchema } from '../schemas/mantenimientos.schemas.js';
import { crearMantenimiento, ErrorMantenimiento, finalizarMantenimiento, listarMantenimientos, obtenerMantenimiento, obtenerMantenimientosActivosPorUnidad } from '../services/mantenimientos.service.js';

export const mantenimientosRouter = Router();

function obtenerId(valor: string): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorMantenimiento('El identificador del mantenimiento no es válido', 400);
  return id;
}

function manejarError(error: unknown, res: Response, operacion: string): void {
  if (error instanceof ErrorMantenimiento) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  console.error(`Error al ${operacion} mantenimiento:`, error);
  res.status(500).json({ success: false, message: `No fue posible ${operacion} el mantenimiento` });
}

mantenimientosRouter.get('/', async (_req, res): Promise<void> => {
  try {
    res.status(200).json({ success: true, message: 'Mantenimientos obtenidos correctamente', data: await listarMantenimientos() });
  } catch (error) { manejarError(error, res, 'consultar'); }
});

mantenimientosRouter.get('/activos/unidad/:unidadId', async (req: Request<{ unidadId: string }>, res): Promise<void> => {
  try {
    const unidadId = Number(req.params.unidadId);
    if (!Number.isInteger(unidadId) || unidadId <= 0) {
      throw new ErrorMantenimiento('El identificador de la unidad no es válido', 400);
    }
    res.status(200).json({
      success: true,
      message: 'Mantenimientos activos obtenidos correctamente',
      data: await obtenerMantenimientosActivosPorUnidad(unidadId),
    });
  } catch (error) { manejarError(error, res, 'consultar'); }
});

mantenimientosRouter.get('/:id', async (req: Request<{ id: string }>, res): Promise<void> => {
  try {
    res.status(200).json({ success: true, message: 'Mantenimiento obtenido correctamente', data: await obtenerMantenimiento(obtenerId(req.params.id)) });
  } catch (error) { manejarError(error, res, 'consultar'); }
});

mantenimientosRouter.post('/', async (req, res): Promise<void> => {
  const validacion = crearMantenimientoSchema.safeParse(req.body);
  if (!validacion.success) {
    res.status(400).json({ success: false, message: validacion.error.issues[0]?.message ?? 'Datos no válidos' });
    return;
  }
  try {
    res.status(201).json({ success: true, message: 'Mantenimiento registrado correctamente', data: await crearMantenimiento(validacion.data) });
  } catch (error) { manejarError(error, res, 'registrar'); }
});

mantenimientosRouter.patch('/:id/finalizar', async (req: Request<{ id: string }>, res): Promise<void> => {
  const validacion = finalizarMantenimientoSchema.safeParse(req.body);
  if (!validacion.success) {
    res.status(400).json({ success: false, message: validacion.error.issues[0]?.message ?? 'Datos no válidos' });
    return;
  }
  try {
    res.status(200).json({ success: true, message: 'Mantenimiento finalizado correctamente', data: await finalizarMantenimiento(obtenerId(req.params.id), validacion.data) });
  } catch (error) { manejarError(error, res, 'finalizar'); }
});
