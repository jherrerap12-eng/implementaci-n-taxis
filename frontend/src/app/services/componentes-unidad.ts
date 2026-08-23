import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ComponenteUnidad,
  InstalarComponenteRequest,
  ReemplazarComponenteRequest,
  RespuestaComponentesUnidad,
  ResultadoReemplazoComponente,
  RetirarComponenteRequest,
} from '../models/componentes-unidad.models';

@Injectable({ providedIn: 'root' })
export class ComponentesUnidadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl =
    'http://localhost:3000/api/componentes-unidad';

  listar(): Observable<RespuestaComponentesUnidad<ComponenteUnidad[]>> {
    return this.http.get<RespuestaComponentesUnidad<ComponenteUnidad[]>>(
      this.apiUrl,
    );
  }

  instalar(
    datos: InstalarComponenteRequest,
  ): Observable<RespuestaComponentesUnidad<ComponenteUnidad[]>> {
    return this.http.post<RespuestaComponentesUnidad<ComponenteUnidad[]>>(
      this.apiUrl,
      datos,
    );
  }

  retirar(
    id: number,
    datos: RetirarComponenteRequest,
  ): Observable<RespuestaComponentesUnidad<ComponenteUnidad>> {
    return this.http.patch<RespuestaComponentesUnidad<ComponenteUnidad>>(
      `${this.apiUrl}/${id}/retirar`,
      datos,
    );
  }

  reemplazar(
    id: number,
    datos: ReemplazarComponenteRequest,
  ): Observable<RespuestaComponentesUnidad<ResultadoReemplazoComponente>> {
    return this.http.post<
      RespuestaComponentesUnidad<ResultadoReemplazoComponente>
    >(`${this.apiUrl}/${id}/reemplazar`, datos);
  }
}
