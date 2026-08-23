import {
  Router,
  type Request,
  type Response,
} from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import {
  autenticar,
  type LocalesAutenticacion,
} from '../middleware/autenticar.js';
import { iniciarSesion } from '../services/auth.service.js';

const esquemaLogin = z.object({
  correo: z.string().trim().email().max(150),
  contrasena: z.string().min(1).max(256),
});

const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message:
        'Demasiados intentos de inicio de sesión. Intenta nuevamente más tarde',
    });
  },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  limitarLogin,
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const validacion = esquemaLogin.safeParse(
      req.body,
    );

    if (!validacion.success) {
      res.status(400).json({
        success: false,
        message: 'Datos de acceso no válidos',
      });
      return;
    }

    try {
      const resultado = await iniciarSesion(
        validacion.data.correo,
        validacion.data.contrasena,
      );

      if (!resultado) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Inicio de sesión correcto',
        data: resultado,
      });
    } catch (error) {
      console.error(
        'Error al iniciar sesión:',
        error,
      );

      res.status(500).json({
        success: false,
        message:
          'No fue posible iniciar sesión',
      });
    }
  },
);

authRouter.get(
  '/me',
  autenticar,
  (
    _req: Request,
    res: Response<unknown, LocalesAutenticacion>,
  ): void => {
    res.status(200).json({
      success: true,
      message: 'Usuario autenticado',
      data: res.locals.usuario,
    });
  },
);
