import argon2 from 'argon2';

import { prisma } from '../lib/prisma.js';
import type {
  ActualizarUsuarioDatos,
  CrearUsuarioDatos,
} from '../schemas/usuarios.schemas.js';

export const seleccionUsuarioSeguro = {
  id: true,
  nombreCompleto: true,
  correo: true,
  rol: true,
  activo: true,
  ultimoAccesoEn: true,
  creadoEn: true,
  actualizadoEn: true,
} as const;

export class ErrorUsuarios extends Error {
  constructor(
    readonly status: 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorUsuarios';
  }
}

export async function listarUsuarios() {
  return prisma.usuario.findMany({
    select: seleccionUsuarioSeguro,
    orderBy: {
      nombreCompleto: 'asc',
    },
  });
}

export async function obtenerUsuario(
  usuarioId: number,
) {
  const usuario = await prisma.usuario.findUnique({
    where: {
      id: usuarioId,
    },
    select: seleccionUsuarioSeguro,
  });

  if (!usuario) {
    throw new ErrorUsuarios(
      404,
      'El usuario no existe',
    );
  }

  return usuario;
}

export async function crearUsuario(
  datos: CrearUsuarioDatos,
) {
  const contrasenaHash = await argon2.hash(
    datos.contrasena,
    {
      type: argon2.argon2id,
    },
  );

  return prisma.usuario.create({
    data: {
      nombreCompleto: datos.nombreCompleto,
      correo: datos.correo,
      contrasenaHash,
      rol: datos.rol,
    },
    select: seleccionUsuarioSeguro,
  });
}

export async function actualizarUsuario(
  usuarioId: number,
  usuarioAutenticadoId: number,
  datos: ActualizarUsuarioDatos,
) {
  return prisma.$transaction(
    async (transaccion) => {
      const usuario =
        await transaccion.usuario.findUnique({
          where: {
            id: usuarioId,
          },
        });

      if (!usuario) {
        throw new ErrorUsuarios(
          404,
          'El usuario no existe',
        );
      }

      const degradaSuperadmin =
        usuario.rol === 'SUPERADMIN' &&
        datos.rol === 'DUENO';

      if (
        usuario.id === usuarioAutenticadoId &&
        degradaSuperadmin
      ) {
        throw new ErrorUsuarios(
          409,
          'No puedes cambiar tu propio rol SUPERADMIN a DUENO',
        );
      }

      if (
        degradaSuperadmin &&
        usuario.activo
      ) {
        const superadminsActivos =
          await transaccion.usuario.count({
            where: {
              rol: 'SUPERADMIN',
              activo: true,
            },
          });

        if (superadminsActivos <= 1) {
          throw new ErrorUsuarios(
            409,
            'No puedes dejar el sistema sin un SUPERADMIN activo',
          );
        }
      }

      return transaccion.usuario.update({
        where: {
          id: usuarioId,
        },
        data: datos,
        select: seleccionUsuarioSeguro,
      });
    },
    {
      isolationLevel: 'Serializable',
    },
  );
}

export async function cambiarEstadoUsuario(
  usuarioId: number,
  usuarioAutenticadoId: number,
  activo: boolean,
) {
  return prisma.$transaction(
    async (transaccion) => {
      const usuario =
        await transaccion.usuario.findUnique({
          where: {
            id: usuarioId,
          },
        });

      if (!usuario) {
        throw new ErrorUsuarios(
          404,
          'El usuario no existe',
        );
      }

      if (
        usuario.id === usuarioAutenticadoId &&
        !activo
      ) {
        throw new ErrorUsuarios(
          409,
          'No puedes inactivar tu propio usuario',
        );
      }

      if (
        !activo &&
        usuario.activo &&
        usuario.rol === 'SUPERADMIN'
      ) {
        const superadminsActivos =
          await transaccion.usuario.count({
            where: {
              rol: 'SUPERADMIN',
              activo: true,
            },
          });

        if (superadminsActivos <= 1) {
          throw new ErrorUsuarios(
            409,
            'No puedes dejar el sistema sin un SUPERADMIN activo',
          );
        }
      }

      return transaccion.usuario.update({
        where: {
          id: usuarioId,
        },
        data: {
          activo,
        },
        select: seleccionUsuarioSeguro,
      });
    },
    {
      isolationLevel: 'Serializable',
    },
  );
}

export async function restablecerContrasena(
  usuarioId: number,
  nuevaContrasena: string,
) {
  const usuario = await prisma.usuario.findUnique({
    where: {
      id: usuarioId,
    },
    select: {
      id: true,
    },
  });

  if (!usuario) {
    throw new ErrorUsuarios(
      404,
      'El usuario no existe',
    );
  }

  const contrasenaHash = await argon2.hash(
    nuevaContrasena,
    {
      type: argon2.argon2id,
    },
  );

  return prisma.usuario.update({
    where: {
      id: usuarioId,
    },
    data: {
      contrasenaHash,
    },
    select: seleccionUsuarioSeguro,
  });
}
