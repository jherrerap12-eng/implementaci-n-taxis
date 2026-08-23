export type ModoInstalacionComponente = 'INDIVIDUAL' | 'POSICIONADO';

export interface PosicionCatalogoComponente {
  id?: number;
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface CatalogoComponente {
  id: number;
  nombre: string;
  descripcion: string | null;
  vidaUtilMesesDefault: number | null;
  vidaUtilKmDefault: number | null;
  alertaDiasAntesDefault: number;
  alertaKmAntesDefault: number;
  modoInstalacion: ModoInstalacionComponente;
  posiciones: PosicionCatalogoComponente[];
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface GuardarCatalogoComponenteRequest {
  nombre: string;
  descripcion: string | null;
  vidaUtilMesesDefault: number | null;
  vidaUtilKmDefault: number | null;
  alertaDiasAntesDefault: number;
  alertaKmAntesDefault: number;
  modoInstalacion: ModoInstalacionComponente;
  posiciones: PosicionCatalogoComponente[];
}

export interface RespuestaCatalogo<T> {
  success: boolean;
  message: string;
  data: T;
}
