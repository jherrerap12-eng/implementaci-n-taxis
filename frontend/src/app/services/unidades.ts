import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type EstadoUnidad =
  | 'DISPONIBLE'
  | 'EN_RUTA'
  | 'MANTENIMIENTO'
  | 'FUERA_DE_SERVICIO';

export interface Unidad {
  id: number;
  numeroUnidad: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  tipoCombustible: 'GASOLINA' | 'DIESEL';
  kilometrajeActual: number;
  intervaloMantenimientoKm: number | null;
  proximoMantenimientoKm: number | null;
  estado: EstadoUnidad;
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearUnidadRequest {
  numeroUnidad: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  tipoCombustible: 'GASOLINA' | 'DIESEL';
  kilometrajeActual: number;
  intervaloMantenimientoKm?: number | null;
  proximoMantenimientoKm?: number | null;
  observaciones?: string;
}

export interface ActualizarUnidadRequest {
  numeroUnidad?: string;
  placa?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  tipoCombustible?: 'GASOLINA' | 'DIESEL';
  intervaloMantenimientoKm?: number | null;
  proximoMantenimientoKm?: number | null;
  observaciones?: string;
}

export interface CambiarEstadoUnidadRequest {
  estado:
    | 'DISPONIBLE'
    | 'EN_RUTA'
    | 'FUERA_DE_SERVICIO';
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class UnidadesService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:3000/api/unidades';

  obtenerUnidades(): Observable<ApiResponse<Unidad[]>> {
    return this.http.get<ApiResponse<Unidad[]>>(
      this.apiUrl,
    );
  }

  registrarUnidad(
    datos: CrearUnidadRequest,
  ): Observable<ApiResponse<Unidad>> {
    return this.http.post<ApiResponse<Unidad>>(
      this.apiUrl,
      datos,
    );
  }

  actualizarUnidad(
    unidadId: number,
    datos: ActualizarUnidadRequest,
  ): Observable<ApiResponse<Unidad>> {
    return this.http.patch<ApiResponse<Unidad>>(
      `${this.apiUrl}/${unidadId}`,
      datos,
    );
  }

  cambiarEstado(
    unidadId: number,
    estado:
      | 'DISPONIBLE'
      | 'EN_RUTA'
      | 'FUERA_DE_SERVICIO',
  ): Observable<ApiResponse<Unidad>> {
    const datos: CambiarEstadoUnidadRequest = {
      estado,
    };

    return this.http.patch<ApiResponse<Unidad>>(
      `${this.apiUrl}/${unidadId}/estado`,
      datos,
    );
  }
}