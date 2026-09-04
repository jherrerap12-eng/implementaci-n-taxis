import { Router, type Request, type Response } from 'express';

import {
  registrarAjusteAhorroSchema,
  registrarRetiroAhorroSchema,
} from '../schemas/ahorro-pilotos.schemas.js';
import {
  ErrorAhorroPiloto,
  listarAhorroPilotos,
  obtenerMovimientosAhorro,
  registrarAjusteAhorro,
  registrarRetiroAhorro,
} from '../services/ahorro-pilotos.service.js';

export const ahorroPilotosRouter = Router();

function pilotoId(valor: string): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorAhorroPiloto(404, 'El piloto no existe');
  return id;
}

function manejarError(error: unknown, res: Response): void {
  if (error instanceof ErrorAhorroPiloto) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  console.error('Error al administrar ahorro de pilotos:', error);
  res.status(500).json({ success: false, message: 'No fue posible procesar el ahorro del piloto' });
}

ahorroPilotosRouter.get('/', async (_req, res): Promise<void> => {
  try {
    res.status(200).json({ success: true, message: 'Ahorros obtenidos correctamente', data: await listarAhorroPilotos() });
  } catch (error) { manejarError(error, res); }
});

ahorroPilotosRouter.get('/:pilotoId/movimientos', async (req: Request<{ pilotoId: string }>, res): Promise<void> => {
  try {
    res.status(200).json({ success: true, message: 'Movimientos obtenidos correctamente', data: await obtenerMovimientosAhorro(pilotoId(req.params.pilotoId)) });
  } catch (error) { manejarError(error, res); }
});

ahorroPilotosRouter.post('/:pilotoId/ajustes', async (req: Request<{ pilotoId: string }>, res): Promise<void> => {
  const validacion = registrarAjusteAhorroSchema.safeParse(req.body);
  if (!validacion.success) {
    res.status(400).json({ success: false, message: validacion.error.issues[0]?.message ?? 'Datos no válidos' });
    return;
  }
  try {
    res.status(201).json({ success: true, message: 'Ajuste registrado correctamente', data: await registrarAjusteAhorro(pilotoId(req.params.pilotoId), validacion.data) });
  } catch (error) { manejarError(error, res); }
});

ahorroPilotosRouter.post('/:pilotoId/retiros', async (req: Request<{ pilotoId: string }>, res): Promise<void> => {
  const validacion = registrarRetiroAhorroSchema.safeParse(req.body);
  if (!validacion.success) {
    res.status(400).json({ success: false, message: validacion.error.issues[0]?.message ?? 'Datos no válidos' });
    return;
  }
  try {
    res.status(201).json({ success: true, message: validacion.data.liquidarTodo ? 'Ahorro liquidado correctamente' : 'Retiro registrado correctamente', data: await registrarRetiroAhorro(pilotoId(req.params.pilotoId), validacion.data) });
  } catch (error) { manejarError(error, res); }
});
