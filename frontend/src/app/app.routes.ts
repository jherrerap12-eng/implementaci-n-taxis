import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { Gastos } from './pages/gastos/gastos';
import { Ingresos } from './pages/ingresos/ingresos';
import { Mantenimientos } from './pages/mantenimientos/mantenimientos';
import { Pilotos } from './pages/pilotos/pilotos';
import { RegistroDiarioComponent } from './pages/registro-diario/registro-diario';
import { ResumenDiarioComponent } from './pages/resumen-diario/resumen-diario';
import { Unidades } from './pages/unidades/unidades';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
    title: 'Panel principal | Sistema de flotilla',
  },
  {
    path: 'registro-diario',
    component: RegistroDiarioComponent,
    title: 'Registro diario | Sistema de flotilla',
  },
  {
    path: 'resumen-diario',
    component: ResumenDiarioComponent,
    title: 'Resumen diario | Sistema de flotilla',
  },
  {
    path: 'ingresos',
    component: Ingresos,
    title: 'Ingresos | Sistema de flotilla',
  },
  {
    path: 'pilotos',
    component: Pilotos,
    title: 'Pilotos | Sistema de flotilla',
  },
  {
    path: 'unidades',
    component: Unidades,
    title: 'Unidades | Sistema de flotilla',
  },
  {
    path: 'mantenimientos',
    component: Mantenimientos,
    title: 'Mantenimientos | Sistema de flotilla',
  },
  {
    path: 'gastos',
    component: Gastos,
    title: 'Gastos | Sistema de flotilla',
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];