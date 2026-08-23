import {
  Router,
  type Request,
  type Response,
} from 'express';

import { obtenerAlertasComponentes } from '../services/alertas-componentes.service.js';

export const componentesRouter = Router();

componentesRouter.get(
  '/alertas',
  async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const alertas = await obtenerAlertasComponentes();

      res.status(200).json({
        success: true,
        message:
          'Alertas de componentes obtenidas correctamente',
        data: alertas,
      });
    } catch (error) {
      console.error(
        'Error al consultar alertas de componentes:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible consultar las alertas de componentes',
      });
    }
  },
);
