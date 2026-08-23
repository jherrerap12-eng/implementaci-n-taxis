import {
  Router,
  type Request,
  type Response,
} from 'express';

import { Prisma } from '../generated/prisma/client.js';
import type { LocalesAutenticacion } from '../middleware/autenticar.js';
import {
  actualizarUsuarioSchema,
  cambiarEstadoUsuarioSchema,
  crearUsuarioSchema,
  restablecerContrasenaSchema,
} from '../schemas/usuarios.schemas.js';
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  ErrorUsuarios,
  listarUsuarios,
  obtenerUsuario,
  restablecerContrasena,
} from '../services/usuarios.service.js';

export const usuariosRouter = Router();

function obtenerIdUsuario(
  id: string,
  res: Response,
): number | null {
  const usuarioId = Number(id);

  if (
    !Number.isInteger(usuarioId) ||
    usuarioId <= 0
  ) {
    res.status(400).json({
      success: false,
      message:
        'El identificador del usuario no es válido',
    });
    return null;
  }

  return usuarioId;
}

function manejarErrorUsuario(
  error: unknown,
  res: Response,
  mensajeGeneral: string,
): void {
  if (error instanceof ErrorUsuarios) {
    res.status(error.status).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    res.status(409).json({
      success: false,
      message:
        'Ya existe un usuario con ese correo',
    });
    return;
  }

  console.error(mensajeGeneral, error);

  res.status(500).json({
    success: false,
    message: mensajeGeneral,
  });
}

usuariosRouter.get(
  '/',
  async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const usuarios = await listarUsuarios();

      res.status(200).json({
        success: true,
        message: 'Usuarios obtenidos correctamente',
        data: usuarios,
      });
    } catch (error) {
      manejarErrorUsuario(
        error,
        res,
        'No fue posible consultar los usuarios',
      );
    }
  },
);

usuariosRouter.get(
  '/:id',
  async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<void> => {
    const usuarioId = obtenerIdUsuario(
      req.params.id,
      res,
    );

    if (usuarioId === null) {
      return;
    }

    try {
      const usuario = await obtenerUsuario(usuarioId);

      res.status(200).json({
        success: true,
        message: 'Usuario obtenido correctamente',
        data: usuario,
      });
    } catch (error) {
      manejarErrorUsuario(
        error,
        res,
        'No fue posible consultar el usuario',
      );
    }
  },
);

usuariosRouter.post(
  '/',
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const validacion = crearUsuarioSchema.safeParse(
      req.body,
    );

    if (!validacion.success) {
      res.status(400).json({
        success: false,
        message:
          'Los datos del usuario no son válidos',
      });
      return;
    }

    try {
      const usuario = await crearUsuario(
        validacion.data,
      );

      res.status(201).json({
        success: true,
        message: 'Usuario creado correctamente',
        data: usuario,
      });
    } catch (error) {
      manejarErrorUsuario(
        error,
        res,
        'No fue posible crear el usuario',
      );
    }
  },
);

usuariosRouter.patch(
  '/:id',
  async (
    req: Request<{ id: string }>,
    res: Response<unknown, LocalesAutenticacion>,
  ): Promise<void> => {
    const usuarioId = obtenerIdUsuario(
      req.params.id,
      res,
    );

    if (usuarioId === null) {
      return;
    }

    const validacion =
      actualizarUsuarioSchema.safeParse(req.body);

    if (!validacion.success) {
      res.status(400).json({
        success: false,
        message:
          'Los datos para actualizar el usuario no son válidos',
      });
      return;
    }

    try {
      const usuario = await actualizarUsuario(
        usuarioId,
        res.locals.usuario.id,
        validacion.data,
      );

      res.status(200).json({
        success: true,
        message: 'Usuario actualizado correctamente',
        data: usuario,
      });
    } catch (error) {
      manejarErrorUsuario(
        error,
        res,
        'No fue posible actualizar el usuario',
      );
    }
  },
);

usuariosRouter.patch(
  '/:id/estado',
  async (
    req: Request<{ id: string }>,
    res: Response<unknown, LocalesAutenticacion>,
  ): Promise<void> => {
    const usuarioId = obtenerIdUsuario(
      req.params.id,
      res,
    );

    if (usuarioId === null) {
      return;
    }

    const validacion =
      cambiarEstadoUsuarioSchema.safeParse(
        req.body,
      );

    if (!validacion.success) {
      res.status(400).json({
        success: false,
        message:
          'El estado del usuario no es válido',
      });
      return;
    }

    try {
      const usuario = await cambiarEstadoUsuario(
        usuarioId,
        res.locals.usuario.id,
        validacion.data.activo,
      );

      res.status(200).json({
        success: true,
        message:
          'Estado del usuario actualizado correctamente',
        data: usuario,
      });
    } catch (error) {
      manejarErrorUsuario(
        error,
        res,
        'No fue posible cambiar el estado del usuario',
      );
    }
  },
);

usuariosRouter.post(
  '/:id/restablecer-contrasena',
  async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<void> => {
    const usuarioId = obtenerIdUsuario(
      req.params.id,
      res,
    );

    if (usuarioId === null) {
      return;
    }

    const validacion =
      restablecerContrasenaSchema.safeParse(
        req.body,
      );

    if (!validacion.success) {
      res.status(400).json({
        success: false,
        message:
          'La nueva contraseña no es válida',
      });
      return;
    }

    try {
      const usuario = await restablecerContrasena(
        usuarioId,
        validacion.data.nuevaContrasena,
      );

      res.status(200).json({
        success: true,
        message:
          'Contraseña restablecida correctamente',
        data: usuario,
      });
    } catch (error) {
      manejarErrorUsuario(
        error,
        res,
        'No fue posible restablecer la contraseña',
      );
    }
  },
);
