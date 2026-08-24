import { z } from 'zod';

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((valor, contexto) => {
    const fechaConvertida = new Date(`${valor}T00:00:00.000Z`);

    if (
      Number.isNaN(fechaConvertida.getTime()) ||
      fechaConvertida.toISOString().slice(0, 10) !== valor
    ) {
      contexto.addIssue({
        code: 'custom',
        message: 'La fecha indicada no es válida',
      });
      return z.NEVER;
    }

    return fechaConvertida;
  });

const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo)
    .nullable()
    .optional()
    .transform((valor) => valor || null);

const enteroPositivoOpcional = z
  .number()
  .int()
  .positive()
  .nullable()
  .optional();

const enteroNoNegativoOpcional = z
  .number()
  .int()
  .nonnegative()
  .nullable()
  .optional();

export const instalarComponenteSchema = z
  .object({
    unidadId: z.number().int().positive(),
    catalogoComponenteId: z.number().int().positive(),
    marca: z.string().trim().min(1).max(100),
    modelo: z.string().trim().min(1).max(100),
    numeroSerie: textoOpcional(120),
    posicion: textoOpcional(80),
    posicionesCatalogoIds: z
      .array(z.number().int().positive())
      .max(50)
      .default([])
      .refine(
        (ids) => new Set(ids).size === ids.length,
        'Las posiciones seleccionadas no pueden repetirse',
      ),
    cantidad: z.number().int().positive(),
    fechaInstalacion: fecha,
    kilometrajeInstalacion: z.number().int().nonnegative(),
    vidaUtilMeses: enteroPositivoOpcional,
    vidaUtilKm: enteroPositivoOpcional,
    alertaDiasAntes: enteroNoNegativoOpcional,
    alertaKmAntes: enteroNoNegativoOpcional,
  })
  .strict();

const mantenimientoOperacionSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('EXISTENTE'),
    mantenimientoId: z.number().int().positive(),
  }).strict(),
  z.object({
    tipo: z.literal('NUEVO'),
    fechaInicio: fecha,
    descripcion: z.string().trim().min(3).max(2000),
    costo: z.number().finite().nonnegative(),
  }).strict(),
]);

export const retirarComponenteSchema = z.object({
  mantenimiento: mantenimientoOperacionSchema,
  fechaRetiro: fecha,
  kilometrajeRetiro: z.number().int().nonnegative(),
  motivoRetiro: z.string().trim().min(3).max(1000),
  observaciones: textoOpcional(2000),
}).strict();

const nuevoComponenteReemplazoSchema = z.object({
  marca: z.string().trim().min(1).max(100),
  modelo: z.string().trim().min(1).max(100),
  numeroSerie: textoOpcional(120),
  fechaInstalacion: fecha,
  kilometrajeInstalacion: z.number().int().nonnegative(),
  vidaUtilMeses: enteroPositivoOpcional,
  vidaUtilKm: enteroPositivoOpcional,
  alertaDiasAntes: enteroNoNegativoOpcional,
  alertaKmAntes: enteroNoNegativoOpcional,
}).strict();

export const reemplazarComponenteSchema = z.object({
  mantenimiento: mantenimientoOperacionSchema,
  fechaRetiro: fecha,
  kilometrajeRetiro: z.number().int().nonnegative(),
  motivoRetiro: z.string().trim().min(3).max(1000),
  observaciones: textoOpcional(2000),
  nuevoComponente: nuevoComponenteReemplazoSchema,
}).strict();

export type InstalarComponenteDatos = z.infer<
  typeof instalarComponenteSchema
>;

export type RetirarComponenteDatos = z.infer<
  typeof retirarComponenteSchema
>;

export type ReemplazarComponenteDatos = z.infer<
  typeof reemplazarComponenteSchema
>;
