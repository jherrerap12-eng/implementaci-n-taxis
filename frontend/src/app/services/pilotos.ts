import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Piloto {
  id: number;
  codigo: string;
  nombreCompleto: string;
  telefono: string | null;
  numeroLicencia: string;
  vencimientoLicencia: string;
  estado: 'ACTIVO' | 'INACTIVO';
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearPilotoRequest {
  codigo: string;
  nombreCompleto: string;
  telefono?: string;
  numeroLicencia: string;
  vencimientoLicencia: string;
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
export class PilotosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/pilotos';

  obtenerPilotos(): Observable<ApiResponse<Piloto[]>> {
    return this.http.get<ApiResponse<Piloto[]>>(this.apiUrl);
  }

  registrarPiloto(
    datos: CrearPilotoRequest,
  ): Observable<ApiResponse<Piloto>> {
    return this.http.post<ApiResponse<Piloto>>(this.apiUrl, datos);
  }
}