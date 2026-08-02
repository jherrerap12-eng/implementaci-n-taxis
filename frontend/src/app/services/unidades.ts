import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Unidad {
  id: number;
  numeroUnidad: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  tipoCombustible: 'GASOLINA' | 'DIESEL';
  kilometrajeActual: number;
  estado:
    | 'DISPONIBLE'
    | 'EN_RUTA'
    | 'MANTENIMIENTO'
    | 'FUERA_DE_SERVICIO';
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
  observaciones?: string;
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
    return this.http.get<ApiResponse<Unidad[]>>(this.apiUrl);
  }

  registrarUnidad(
    datos: CrearUnidadRequest,
  ): Observable<ApiResponse<Unidad>> {
    return this.http.post<ApiResponse<Unidad>>(
      this.apiUrl,
      datos,
    );
  }
}