export type RolUsuario =
  | 'SUPERADMIN'
  | 'DUENO';

export interface UsuarioAutenticado {
  id: number;
  nombreCompleto: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  ultimoAccesoEn: string | null;
}

export interface RespuestaLogin {
  success: boolean;
  message: string;
  data: {
    token: string;
    usuario: UsuarioAutenticado;
  };
}
