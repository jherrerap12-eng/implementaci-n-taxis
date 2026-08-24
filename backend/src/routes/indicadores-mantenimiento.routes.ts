import { Router, type Response } from 'express';

import { obtenerIndicadoresMantenimiento } from '../services/indicadores-mantenimiento.service.js';

export const indicadoresMantenimientoRouter = Router();

indicadoresMantenimientoRouter.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const indicadores = await obtenerIndicadoresMantenimiento();
    res.status(200).json({
      success: true,
      message: 'Indicadores de mantenimiento obtenidos correctamente',
      data: indicadores,
    });
  } catch (error) {
    console.error('Error al consultar indicadores de mantenimiento:', error);
    res.status(500).json({
      success: false,
      message: 'No fue posible consultar los indicadores de mantenimiento',
    });
  }
});
