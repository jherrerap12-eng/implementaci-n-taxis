import argon2 from 'argon2';

import type { RolUsuario } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { generarTokenAcceso } from './tokens.service.js';

export interface UsuarioAutenticado {
  id: number;
  nombreCompleto: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  ultimoAccesoEn: Date | null;
}

const contrasenaFalsaHash = argon2.hash(
  'comparacion-interna-usuario-inexistente',
  {
    type: argon2.argon2id,
  },
);

const seleccionUsuarioSeguro = {
  id: true,
  nombreCompleto: true,
  correo: true,
  rol: true,
  activo: true,
  ultimoAccesoEn: true,
} as const;

export function normalizarCorreo(
  correo: string,
): string {
  return correo.trim().toLowerCase();
}

export async function iniciarSesion(
  correo: string,
  contrasena: string,
): Promise<{
  token: string;
  usuario: UsuarioAutenticado;
} | null> {
  const correoNormalizado = normalizarCorreo(correo);

  const usuario = await prisma.usuario.findFirst({
    where: {
      correo: correoNormalizado,
      activo: true,
    },
  });

  const hashComparacion =
    usuario?.contrasenaHash ??
    (await contrasenaFalsaHash);

  const contrasenaValida = await argon2.verify(
    hashComparacion,
    contrasena,
  );

  if (!usuario || !contrasenaValida) {
    return null;
  }

  const ultimoAccesoEn = new Date();

  const usuarioActualizado =
    await prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: {
        ultimoAccesoEn,
      },
      select: seleccionUsuarioSeguro,
    });

  const token = await generarTokenAcceso(
    usuarioActualizado.id,
    usuarioActualizado.rol,
  );

  return {
    token,
    usuario: usuarioActualizado,
  };
}

export async function obtenerUsuarioActivo(
  usuarioId: number,
): Promise<UsuarioAutenticado | null> {
  return prisma.usuario.findFirst({
    where: {
      id: usuarioId,
      activo: true,
    },
    select: seleccionUsuarioSeguro,
  });
}
