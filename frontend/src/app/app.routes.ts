import { inject } from '@angular/core';
import {
  RedirectFunction,
  Router,
  Routes,
} from '@angular/router';
import { map } from 'rxjs';

import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { Dashboard } from './pages/dashboard/dashboard';
import { Gastos } from './pages/gastos/gastos';
import { Ingresos } from './pages/ingresos/ingresos';
import { Login } from './pages/login/login';
import { Mantenimientos } from './pages/mantenimientos/mantenimientos';
import { Pilotos } from './pages/pilotos/pilotos';
import { RegistroDiarioComponent } from './pages/registro-diario/registro-diario';
import { ResumenDiarioComponent } from './pages/resumen-diario/resumen-diario';
import { Unidades } from './pages/unidades/unidades';
import { Usuarios } from './pages/usuarios/usuarios';
import { CatalogoComponentes } from './pages/catalogo-componentes/catalogo-componentes';
import { ComponentesUnidad } from './pages/componentes-unidad/componentes-unidad';
import { AuthService } from './services/auth';

const redireccionInicial: RedirectFunction = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.autenticado()) {
    return router.createUrlTree(['/dashboard']);
  }

  return authService.restaurarSesion().pipe(
    map((usuario) =>
      router.createUrlTree([
        usuario ? '/dashboard' : '/login',
      ]),
    ),
  );
};

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
    title: 'Iniciar sesión | Sistema de flotilla',
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN', 'DUENO'],
    },
    title: 'Panel principal | Sistema de flotilla',
  },
  {
    path: 'registro-diario',
    component: RegistroDiarioComponent,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN'],
    },
    title: 'Registro diario | Sistema de flotilla',
  },
  {
    path: 'resumen-diario',
    component: ResumenDiarioComponent,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN', 'DUENO'],
    },
    title: 'Resumen diario | Sistema de flotilla',
  },
  {
    path: 'ingresos',
    component: Ingresos,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN', 'DUENO'],
    },
    title: 'Ingresos | Sistema de flotilla',
  },
  {
    path: 'pilotos',
    component: Pilotos,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN'],
    },
    title: 'Pilotos | Sistema de flotilla',
  },
  {
    path: 'unidades',
    component: Unidades,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN'],
    },
    title: 'Unidades | Sistema de flotilla',
  },
  {
    path: 'mantenimientos',
    component: Mantenimientos,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN'],
    },
    title: 'Mantenimientos | Sistema de flotilla',
  },
  {
    path: 'gastos',
    component: Gastos,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN'],
    },
    title: 'Gastos | Sistema de flotilla',
  },
  {
    path: 'usuarios',
    component: Usuarios,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN'],
    },
    title: 'Usuarios | Sistema de flotilla',
  },
  {
    path: 'catalogo-componentes',
    component: CatalogoComponentes,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN'],
    },
    title: 'Catálogo de componentes | Sistema de flotilla',
  },
  {
    path: 'componentes-unidad',
    component: ComponentesUnidad,
    canActivate: [authGuard],
    data: {
      roles: ['SUPERADMIN'],
    },
    title: 'Componentes instalados | Sistema de flotilla',
  },
  {
    path: '',
    redirectTo: redireccionInicial,
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: redireccionInicial,
  },
];
