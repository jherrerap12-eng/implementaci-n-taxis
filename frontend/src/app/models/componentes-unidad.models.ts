export type EstadoComponenteUnidad = 'INSTALADO' | 'RETIRADO';

export interface EvaluacionVidaUtilComponente {
  porcentajeVidaRestante: number;
  nivelRiesgo: 'VERDE' | 'NARANJA' | 'AMARILLO' | 'ROJO';
  estado: 'NORMAL' | 'PROXIMO_CAMBIO' | 'URGENTE';
  motivo: 'NINGUNO' | 'TIEMPO' | 'KILOMETRAJE' | 'AMBOS';
  diasRestantes: number | null;
  kilometrosRestantes: number | null;
  detalle: string;
}

export interface ComponenteUnidad {
  id: number;
  marca: string;
  modelo: string;
  numeroSerie: string | null;
  posicion: string | null;
  posicionCatalogoId: number | null;
  cantidad: number;
  fechaInstalacion: string;
  kilometrajeInstalacion: number;
  vidaUtilMeses: number | null;
  vidaUtilKm: number | null;
  alertaDiasAntes: number;
  alertaKmAntes: number;
  estado: EstadoComponenteUnidad;
  fechaRetiro: string | null;
  kilometrajeRetiro: number | null;
  motivoRetiro: string | null;
  evaluacionVidaUtil: EvaluacionVidaUtilComponente | null;
  unidad: {
    id: number;
    numeroUnidad: string;
    placa: string;
    kilometrajeActual: number;
  };
  catalogoComponente: {
    id: number;
    nombre: string;
    activo: boolean;
    modoInstalacion: 'INDIVIDUAL' | 'POSICIONADO';
  };
  posicionCatalogo: {
    id: number;
    codigo: string;
    nombre: string;
    activo: boolean;
  } | null;
}

export interface InstalarComponenteRequest {
  unidadId: number;
  catalogoComponenteId: number;
  marca: string;
  modelo: string;
  numeroSerie: string | null;
  posicion: string | null;
  posicionesCatalogoIds: number[];
  cantidad: number;
  fechaInstalacion: string;
  kilometrajeInstalacion: number;
  vidaUtilMeses: number | null;
  vidaUtilKm: number | null;
  alertaDiasAntes: number | null;
  alertaKmAntes: number | null;
}

export interface RetirarComponenteRequest {
  fechaRetiro: string;
  kilometrajeRetiro: number;
  motivoRetiro: string;
}

export interface ReemplazarComponenteRequest {
  fechaRetiro: string;
  kilometrajeRetiro: number;
  motivoRetiro: string;
  observacionesRetiro: string | null;
  marca: string;
  modelo: string;
  numeroSerie: string | null;
  fechaInstalacion: string;
  kilometrajeInstalacion: number;
  vidaUtilMeses: number | null;
  vidaUtilKm: number | null;
  alertaDiasAntes: number | null;
  alertaKmAntes: number | null;
}

export interface ResultadoReemplazoComponente {
  anterior: ComponenteUnidad;
  nuevo: ComponenteUnidad;
}

export interface RespuestaComponentesUnidad<T> {
  success: boolean;
  message: string;
  data: T;
}
