import { Routes } from '@angular/router';

import { Pilotos } from './pages/pilotos/pilotos';
import { RegistroDiarioComponent } from './pages/registro-diario/registro-diario';
import { Unidades } from './pages/unidades/unidades';

export const routes: Routes = [
  {
    path: 'registro-diario',
    component: RegistroDiarioComponent,
    title: 'Registro diario | Sistema de flotilla',
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
    path: '',
    redirectTo: 'registro-diario',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'registro-diario',
  },
];