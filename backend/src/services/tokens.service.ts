import {
  SignJWT,
  jwtVerify,
} from 'jose';

import type { RolUsuario } from '../generated/prisma/enums.js';
import { env } from '../config/env.js';

const claveJwt = new TextEncoder().encode(
  env.JWT_SECRET,
);

const algoritmoJwt = 'HS256';

export interface TokenAutenticacion {
  usuarioId: number;
  rol: RolUsuario;
}

export async function generarTokenAcceso(
  usuarioId: number,
  rol: RolUsuario,
): Promise<string> {
  return new SignJWT({ rol })
    .setProtectedHeader({ alg: algoritmoJwt })
    .setSubject(usuarioId.toString())
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(claveJwt);
}

export async function verificarTokenAcceso(
  token: string,
): Promise<TokenAutenticacion> {
  const { payload } = await jwtVerify(
    token,
    claveJwt,
    {
      algorithms: [algoritmoJwt],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
  );

  const usuarioId = Number(payload.sub);

  if (
    !Number.isInteger(usuarioId) ||
    usuarioId <= 0 ||
    (payload.rol !== 'SUPERADMIN' &&
      payload.rol !== 'DUENO')
  ) {
    throw new Error('El token no contiene una identidad válida');
  }

  return {
    usuarioId,
    rol: payload.rol,
  };
}
