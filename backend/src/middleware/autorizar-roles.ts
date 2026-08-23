import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import type { RolUsuario } from '../generated/prisma/enums.js';
import type { LocalesAutenticacion } from './autenticar.js';

export function autorizarRoles(
  ...rolesPermitidos: RolUsuario[]
) {
  return (
    _req: Request,
    res: Response<unknown, LocalesAutenticacion>,
    next: NextFunction,
  ): void => {
    if (
      !rolesPermitidos.includes(
        res.locals.usuario.rol,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          'No tienes permisos para realizar esta acción',
      });
      return;
    }

    next();
  };
}
