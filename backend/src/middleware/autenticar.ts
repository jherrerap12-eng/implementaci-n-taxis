import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import {
  obtenerUsuarioActivo,
  type UsuarioAutenticado,
} from '../services/auth.service.js';
import { verificarTokenAcceso } from '../services/tokens.service.js';

export interface LocalesAutenticacion {
  usuario: UsuarioAutenticado;
}

export async function autenticar(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const autorizacion = req.headers.authorization;

  if (
    !autorizacion ||
    !autorizacion.startsWith('Bearer ')
  ) {
    res.status(401).json({
      success: false,
      message: 'Autenticación requerida',
    });
    return;
  }

  const token = autorizacion.slice(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Autenticación requerida',
    });
    return;
  }

  try {
    const identidad =
      await verificarTokenAcceso(token);

    const usuario = await obtenerUsuarioActivo(
      identidad.usuarioId,
    );

    if (!usuario) {
      res.status(401).json({
        success: false,
        message: 'La sesión no es válida',
      });
      return;
    }

    res.locals.usuario = usuario;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
    });
  }
}
