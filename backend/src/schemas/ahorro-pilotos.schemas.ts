import { z } from 'zod';

const monto = z
  .number()
  .finite()
  .positive('El monto debe ser mayor que cero')
  .max(9_999_999_999.99, 'El monto excede el máximo permitido')
  .refine(
    (valor) => Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-8,
    'El monto admite como máximo dos decimales',
  );

export const registrarAjusteAhorroSchema = z
  .object({
    tipo: z.enum(['INGRESO', 'EGRESO']),
    monto,
    descripcion: z.string().trim().min(3).max(1000),
  })
  .strict();

export const registrarRetiroAhorroSchema = z
  .object({
    liquidarTodo: z.boolean().default(false),
    monto: monto.optional(),
    descripcion: z.string().trim().max(1000).nullable().optional()
      .transform((valor) => valor || null),
  })
  .strict()
  .superRefine((datos, contexto) => {
    if (!datos.liquidarTodo && datos.monto === undefined) {
      contexto.addIssue({
        code: 'custom',
        path: ['monto'],
        message: 'Indica el monto que deseas retirar',
      });
    }
  });

export type RegistrarAjusteAhorroDatos = z.infer<typeof registrarAjusteAhorroSchema>;
export type RegistrarRetiroAhorroDatos = z.infer<typeof registrarRetiroAhorroSchema>;
