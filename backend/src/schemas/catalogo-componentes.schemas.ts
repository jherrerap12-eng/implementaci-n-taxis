import { z } from 'zod';

const nombre = z.string().trim().min(2).max(100);

const descripcion = z
  .string()
  .trim()
  .max(1000)
  .nullable()
  .transform((valor) => valor || null);

const vidaUtil = z.number().int().positive().nullable();
const umbralAlerta = z.number().int().nonnegative();

const posicionCatalogo = z
  .object({
    id: z.number().int().positive().optional(),
    codigo: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(/^[A-Za-z0-9_]+$/)
      .transform((valor) => valor.toUpperCase()),
    nombre: z.string().trim().min(2).max(100),
    orden: z.number().int().nonnegative(),
    activo: z.boolean(),
  })
  .strict();

const configuracionCatalogo = {
  nombre,
  descripcion,
  vidaUtilMesesDefault: vidaUtil,
  vidaUtilKmDefault: vidaUtil,
  alertaDiasAntesDefault: umbralAlerta,
  alertaKmAntesDefault: umbralAlerta,
  modoInstalacion: z.enum(['INDIVIDUAL', 'POSICIONADO']),
  posiciones: z.array(posicionCatalogo).max(50),
};

function tieneVidaUtil(datos: {
  vidaUtilMesesDefault: number | null;
  vidaUtilKmDefault: number | null;
}): boolean {
  return (
    datos.vidaUtilMesesDefault !== null ||
    datos.vidaUtilKmDefault !== null
  );
}

function validarConfiguracion(
  datos: {
    modoInstalacion: 'INDIVIDUAL' | 'POSICIONADO';
    posiciones: Array<{ codigo: string; activo: boolean }>;
  },
  contexto: z.RefinementCtx,
): void {
  if (
    datos.modoInstalacion === 'POSICIONADO' &&
    !datos.posiciones.some((posicion) => posicion.activo)
  ) {
    contexto.addIssue({
      code: 'custom',
      path: ['posiciones'],
      message:
        'Un componente posicionado requiere al menos una posición activa',
    });
  }

  if (
    datos.modoInstalacion === 'INDIVIDUAL' &&
    datos.posiciones.some((posicion) => posicion.activo)
  ) {
    contexto.addIssue({
      code: 'custom',
      path: ['posiciones'],
      message:
        'Un componente individual no puede tener posiciones activas',
    });
  }

  const codigos = datos.posiciones.map((posicion) => posicion.codigo);
  if (new Set(codigos).size !== codigos.length) {
    contexto.addIssue({
      code: 'custom',
      path: ['posiciones'],
      message: 'Los códigos de posición no pueden repetirse',
    });
  }
}

export const crearCatalogoComponenteSchema = z
  .object(configuracionCatalogo)
  .strict()
  .refine(tieneVidaUtil, {
    message:
      'Debes configurar vida útil en meses, kilómetros o ambos',
  })
  .superRefine(validarConfiguracion);

export const actualizarCatalogoComponenteSchema = z
  .object(configuracionCatalogo)
  .strict()
  .refine(tieneVidaUtil, {
    message:
      'Debes configurar vida útil en meses, kilómetros o ambos',
  })
  .superRefine(validarConfiguracion);

export const cambiarEstadoCatalogoComponenteSchema = z
  .object({
    activo: z.boolean(),
  })
  .strict();

export type CrearCatalogoComponenteDatos = z.infer<
  typeof crearCatalogoComponenteSchema
>;

export type ActualizarCatalogoComponenteDatos = z.infer<
  typeof actualizarCatalogoComponenteSchema
>;
