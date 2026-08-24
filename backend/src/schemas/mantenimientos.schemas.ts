import { z } from 'zod';

const fecha = (mensaje: string) =>
  z.string({ message: mensaje }).trim().min(1, mensaje).transform((valor, contexto) => {
    const fechaConvertida = new Date(`${valor}T00:00:00.000Z`);
    if (Number.isNaN(fechaConvertida.getTime()) || fechaConvertida.toISOString().slice(0, 10) !== valor) {
      contexto.addIssue({ code: 'custom', message: mensaje });
      return z.NEVER;
    }
    return fechaConvertida;
  });

export const crearMantenimientoSchema = z.object({
  unidadId: z.coerce.number({ message: 'La unidad seleccionada no es válida' }).int('La unidad seleccionada no es válida').positive('La unidad seleccionada no es válida'),
  fechaInicio: fecha('La fecha de inicio no es válida'),
  descripcion: z.string({ message: 'Completa todos los campos obligatorios' }).trim().min(1, 'Completa todos los campos obligatorios'),
  costo: z.coerce.number({ message: 'El costo del mantenimiento no es válido' }).nonnegative('El costo del mantenimiento no es válido'),
}).strict();

export const finalizarMantenimientoSchema = z.object({
  fechaFin: fecha('La fecha de finalización no es válida'),
}).strict();

export type CrearMantenimientoDatos = z.infer<typeof crearMantenimientoSchema>;
export type FinalizarMantenimientoDatos = z.infer<typeof finalizarMantenimientoSchema>;
