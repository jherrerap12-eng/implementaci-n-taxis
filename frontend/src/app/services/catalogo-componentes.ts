import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CatalogoComponente,
  GuardarCatalogoComponenteRequest,
  RespuestaCatalogo,
} from '../models/catalogo-componentes.models';

@Injectable({ providedIn: 'root' })
export class CatalogoComponentesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/catalogo-componentes`;

  listar(): Observable<RespuestaCatalogo<CatalogoComponente[]>> {
    return this.http.get<RespuestaCatalogo<CatalogoComponente[]>>(
      this.apiUrl,
    );
  }

  obtener(id: number): Observable<RespuestaCatalogo<CatalogoComponente>> {
    return this.http.get<RespuestaCatalogo<CatalogoComponente>>(
      `${this.apiUrl}/${id}`,
    );
  }

  crear(
    datos: GuardarCatalogoComponenteRequest,
  ): Observable<RespuestaCatalogo<CatalogoComponente>> {
    return this.http.post<RespuestaCatalogo<CatalogoComponente>>(
      this.apiUrl,
      datos,
    );
  }

  actualizar(
    id: number,
    datos: GuardarCatalogoComponenteRequest,
  ): Observable<RespuestaCatalogo<CatalogoComponente>> {
    return this.http.patch<RespuestaCatalogo<CatalogoComponente>>(
      `${this.apiUrl}/${id}`,
      datos,
    );
  }

  cambiarEstado(
    id: number,
    activo: boolean,
  ): Observable<RespuestaCatalogo<CatalogoComponente>> {
    return this.http.patch<RespuestaCatalogo<CatalogoComponente>>(
      `${this.apiUrl}/${id}/estado`,
      { activo },
    );
  }
}
