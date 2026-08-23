import { z } from 'zod';

const nombreCompleto = z
  .string()
  .trim()
  .min(3)
  .max(150);

const correo = z
  .string()
  .trim()
  .email()
  .max(150)
  .transform((valor) => valor.toLowerCase());

const contrasena = z
  .string()
  .min(12)
  .max(256);

const rol = z.enum([
  'SUPERADMIN',
  'DUENO',
]);

export const crearUsuarioSchema = z
  .object({
    nombreCompleto,
    correo,
    contrasena,
    rol,
  })
  .strict();

export const actualizarUsuarioSchema = z
  .object({
    nombreCompleto: nombreCompleto.optional(),
    correo: correo.optional(),
    rol: rol.optional(),
  })
  .strict()
  .refine(
    (datos) => Object.keys(datos).length > 0,
    {
      message:
        'Debes indicar al menos un campo para actualizar',
    },
  );

export const cambiarEstadoUsuarioSchema = z
  .object({
    activo: z.boolean(),
  })
  .strict();

export const restablecerContrasenaSchema = z
  .object({
    nuevaContrasena: contrasena,
  })
  .strict();

export type CrearUsuarioDatos = z.infer<
  typeof crearUsuarioSchema
>;

export type ActualizarUsuarioDatos = z.infer<
  typeof actualizarUsuarioSchema
>;
