import { RolUsuario } from './auth.models';

export interface UsuarioAdministrado {
  id: number;
  nombreCompleto: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  ultimoAccesoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearUsuarioRequest {
  nombreCompleto: string;
  correo: string;
  contrasena: string;
  rol: 'DUENO';
}

export interface ActualizarUsuarioRequest {
  nombreCompleto: string;
  correo: string;
  rol: 'DUENO';
}

export interface CambiarEstadoUsuarioRequest {
  activo: boolean;
}

export interface RestablecerContrasenaRequest {
  nuevaContrasena: string;
}

export interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
}
