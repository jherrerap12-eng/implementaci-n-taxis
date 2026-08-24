import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Unidad } from './unidades';

export interface Mantenimiento {
  id: number;
  unidadId: number;
  fechaInicio: string;
  fechaFin: string | null;
  kilometraje: number;
  descripcion: string;
  costo: string;
  estado: 'EN_PROCESO' | 'FINALIZADO';
  creadoEn: string;
  actualizadoEn: string;
  unidad: Unidad;
  componentes: MantenimientoComponente[];
}

export interface MantenimientoComponente {
  id: number;
  accion: 'INSPECCION' | 'MANTENIMIENTO' | 'INSTALACION' | 'RETIRO' | 'REEMPLAZO';
  observaciones: string | null;
  creadoEn: string;
  componente: {
    id: number;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    posicion: string | null;
    estado: 'INSTALADO' | 'RETIRADO';
  };
}

export interface CrearMantenimientoRequest {
  unidadId: number;
  fechaInicio: string;
  descripcion: string;
  costo: number;
}

export interface FinalizarMantenimientoRequest {
  fechaFin: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class MantenimientosService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:3000/api/mantenimientos';

  obtenerMantenimientos(): Observable<
    ApiResponse<Mantenimiento[]>
  > {
    return this.http.get<ApiResponse<Mantenimiento[]>>(
      this.apiUrl,
    );
  }

  obtenerPorId(mantenimientoId: number): Observable<ApiResponse<Mantenimiento>> {
    return this.http.get<ApiResponse<Mantenimiento>>(`${this.apiUrl}/${mantenimientoId}`);
  }

  obtenerActivosPorUnidad(
    unidadId: number,
  ): Observable<ApiResponse<Mantenimiento[]>> {
    return this.http.get<ApiResponse<Mantenimiento[]>>(
      `${this.apiUrl}/activos/unidad/${unidadId}`,
    );
  }

  registrar(
    datos: CrearMantenimientoRequest,
  ): Observable<ApiResponse<Mantenimiento>> {
    return this.http.post<ApiResponse<Mantenimiento>>(
      this.apiUrl,
      datos,
    );
  }

  finalizar(
    mantenimientoId: number,
    datos: FinalizarMantenimientoRequest,
  ): Observable<ApiResponse<Mantenimiento>> {
    return this.http.patch<ApiResponse<Mantenimiento>>(
      `${this.apiUrl}/${mantenimientoId}/finalizar`,
      datos,
    );
  }
}
