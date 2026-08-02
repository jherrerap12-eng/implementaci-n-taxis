import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Piloto } from './pilotos';
import { Unidad } from './unidades';

export interface CrearRegistroDiarioRequest {
  pilotoId: number;
  unidadId: number;
  fecha: string;
  kilometrajeFinal: number;
  montoLiquidado: number;
  observaciones?: string;
}

export interface RegistrarCombustibleRequest {
  sinCombustible: boolean;
  monto?: number;
  galones?: number;
  precioGalon?: number;
}

export interface CargaCombustible {
  id: number;
  registroDiarioId: number;
  monto: string;
  galones: string;
  precioGalon: string;
  creadoEn: string;
}

export interface RegistroDiario {
  id: number;
  pilotoId: number;
  unidadId: number;
  fecha: string;
  kilometrajeInicial: number;
  kilometrajeFinal: number;
  montoLiquidado: string;
  estado: 'PENDIENTE_COMBUSTIBLE' | 'COMPLETADO';
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
  piloto: Piloto;
  unidad: Unidad;
  cargasCombustible?: CargaCombustible[];
}

export interface ResultadoCombustible {
  registro: RegistroDiario;
  carga: CargaCombustible | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class RegistrosDiariosService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:3000/api/registros-diarios';

  registrar(
    datos: CrearRegistroDiarioRequest,
  ): Observable<ApiResponse<RegistroDiario>> {
    return this.http.post<ApiResponse<RegistroDiario>>(
      this.apiUrl,
      datos,
    );
  }

  registrarCombustible(
    registroId: number,
    datos: RegistrarCombustibleRequest,
  ): Observable<ApiResponse<ResultadoCombustible>> {
    return this.http.post<ApiResponse<ResultadoCombustible>>(
      `${this.apiUrl}/${registroId}/combustible`,
      datos,
    );
  }
}