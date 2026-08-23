import 'dotenv/config';

import { z } from 'zod';

const esquemaEntorno = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
});

const resultado = esquemaEntorno.safeParse(process.env);

if (!resultado.success) {
  console.error(
    'Variables de entorno de autenticación inválidas:',
    resultado.error.flatten().fieldErrors,
  );

  throw new Error(
    'La configuración de autenticación no está completa',
  );
}

export const env = resultado.data;
