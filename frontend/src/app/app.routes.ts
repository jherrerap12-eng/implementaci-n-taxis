import { Routes } from '@angular/router';

import { Pilotos } from './pages/pilotos/pilotos';
import { Unidades } from './pages/unidades/unidades';

export const routes: Routes = [
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
    redirectTo: 'pilotos',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'pilotos',
  },
];