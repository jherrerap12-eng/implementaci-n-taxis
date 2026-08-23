import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  throwError,
} from 'rxjs';

import { AuthService } from '../services/auth';

const claveToken = 'flotilla_access_token';

let redireccionEnCurso = false;

export const authInterceptor: HttpInterceptorFn = (
  request,
  next,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const esLogin = request.url.includes(
    '/api/auth/login',
  );

  const esUsuarioActual = request.url.includes(
    '/api/auth/me',
  );

  const token = sessionStorage.getItem(claveToken);

  const requestAutenticado =
    token && !esLogin
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : request;

  return next(requestAutenticado).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        authService.cerrarSesion();

        const omitirRedireccion =
          esLogin ||
          esUsuarioActual ||
          router.url === '/login';

        if (
          !omitirRedireccion &&
          !redireccionEnCurso
        ) {
          redireccionEnCurso = true;

          void router
            .navigateByUrl('/login')
            .finally(() => {
              redireccionEnCurso = false;
            });
        }
      }

      return throwError(() => error);
    }),
  );
};
