import 'dotenv/config';

import argon2 from 'argon2';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';

const esquemaSuperadmin = z.object({
  SUPERADMIN_NOMBRE: z.string().trim().min(3).max(150),
  SUPERADMIN_CORREO: z.string().trim().email().max(150),
  SUPERADMIN_PASSWORD: z.string().min(12).max(256),
});

async function crearSuperadmin(): Promise<void> {
  const variables = esquemaSuperadmin.parse(
    process.env,
  );

  const correo = variables.SUPERADMIN_CORREO
    .trim()
    .toLowerCase();

  const contrasenaHash = await argon2.hash(
    variables.SUPERADMIN_PASSWORD,
    {
      type: argon2.argon2id,
    },
  );

  const usuario = await prisma.usuario.upsert({
    where: {
      correo,
    },
    create: {
      nombreCompleto:
        variables.SUPERADMIN_NOMBRE.trim(),
      correo,
      contrasenaHash,
      rol: 'SUPERADMIN',
      activo: true,
    },
    update: {
      nombreCompleto:
        variables.SUPERADMIN_NOMBRE.trim(),
      contrasenaHash,
      rol: 'SUPERADMIN',
      activo: true,
    },
    select: {
      id: true,
      nombreCompleto: true,
      correo: true,
      rol: true,
      activo: true,
    },
  });

  console.log(
    `SUPERADMIN preparado: ${usuario.correo} (id ${usuario.id})`,
  );
}

crearSuperadmin()
  .catch((error: unknown) => {
    console.error(
      'No fue posible crear el SUPERADMIN:',
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
