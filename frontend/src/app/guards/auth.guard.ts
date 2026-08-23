import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanMatchFn,
  Router,
} from '@angular/router';
import { map } from 'rxjs';

import { RolUsuario } from '../models/auth.models';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (
  route,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const rolesPermitidos = route.data[
    'roles'
  ] as RolUsuario[] | undefined;

  const autorizar = () => {
    if (!authService.autenticado()) {
      return router.createUrlTree(['/login']);
    }

    if (
      rolesPermitidos?.length &&
      !authService.tieneRol(...rolesPermitidos)
    ) {
      return router.createUrlTree(['/dashboard']);
    }

    return true;
  };

  if (authService.autenticado()) {
    return autorizar();
  }

  return authService
    .restaurarSesion()
    .pipe(map(() => autorizar()));
};

export const sesionActivaMatchGuard: CanMatchFn = () => {
  const authService = inject(AuthService);

  if (authService.autenticado()) {
    return true;
  }

  return authService
    .restaurarSesion()
    .pipe(map((usuario) => usuario !== null));
};
