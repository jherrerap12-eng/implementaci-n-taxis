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
  mantenimiento:
    | { tipo: 'EXISTENTE'; mantenimientoId: number }
    | {
        tipo: 'NUEVO';
        fechaInicio: string;
        descripcion: string;
        costo: number;
      };
  fechaRetiro: string;
  kilometrajeRetiro: number;
  motivoRetiro: string;
  observaciones: string | null;
}

export interface ResultadoRetiroComponente {
  mantenimiento: {
    id: number;
    estado: 'EN_PROCESO';
    costo: string;
  };
  componente: ComponenteUnidad;
}

export interface ReemplazarComponenteRequest {
  mantenimiento:
    | { tipo: 'EXISTENTE'; mantenimientoId: number }
    | {
        tipo: 'NUEVO';
        fechaInicio: string;
        descripcion: string;
        costo: number;
      };
  fechaRetiro: string;
  kilometrajeRetiro: number;
  motivoRetiro: string;
  observaciones: string | null;
  nuevoComponente: {
    marca: string;
    modelo: string;
    numeroSerie: string | null;
    fechaInstalacion: string;
    kilometrajeInstalacion: number;
    vidaUtilMeses: number | null;
    vidaUtilKm: number | null;
    alertaDiasAntes: number | null;
    alertaKmAntes: number | null;
  };
}

export interface ResultadoReemplazoComponente {
  mantenimiento: {
    id: number;
    estado: 'EN_PROCESO';
    costo: string;
  };
  anterior: ComponenteUnidad;
  nuevo: ComponenteUnidad;
}

export interface HistorialTecnicoComponente {
  id: number;
  unidad: { id: number; codigo: string; placa: string };
  componente: {
    catalogoId: number;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    posicion: string;
  };
  instalacion: { fecha: string; kilometraje: number };
  retiro: {
    fecha: string | null;
    kilometraje: number | null;
    motivo: string | null;
    observaciones: string | null;
  };
  uso: {
    kilometrosUtilizados: number | null;
    diasUtilizados: number | null;
  };
  mantenimiento: {
    id: number;
    accion: 'REEMPLAZO' | 'RETIRO';
    descripcion: string;
    fechaInicio: string;
    costoTotal: string;
    observacionesAccion: string | null;
  } | null;
}

export interface RespuestaComponentesUnidad<T> {
  success: boolean;
  message: string;
  data: T;
}
