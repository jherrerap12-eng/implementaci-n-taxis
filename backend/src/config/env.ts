import 'dotenv/config';

import { z } from 'zod';

const esquemaEntorno = z.object({
  DATABASE_URL: z.string().url().regex(
    /^postgres(?:ql)?:\/\//,
    'DATABASE_URL debe utilizar el protocolo postgres o postgresql',
  ),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  FRONTEND_URL: z.string().url()
    .transform((valor) => valor.replace(/\/+$/, ''))
    .optional(),
});

const resultado = esquemaEntorno.safeParse(process.env);

if (!resultado.success) {
  console.error(
    'Variables de entorno inválidas:',
    resultado.error.flatten().fieldErrors,
  );

  throw new Error(
    'La configuración del backend no está completa',
  );
}

export const env = resultado.data;
