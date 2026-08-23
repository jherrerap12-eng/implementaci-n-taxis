import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../services/auth';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.autenticado()) {
    return router.createUrlTree(['/dashboard']);
  }

  return authService.restaurarSesion().pipe(
    map((usuario) =>
      usuario
        ? router.createUrlTree(['/dashboard'])
        : true,
    ),
  );
};
