import { Routes } from '@angular/router';

import { Pilotos } from './pages/pilotos/pilotos';

export const routes: Routes = [
  {
    path: 'pilotos',
    component: Pilotos,
    title: 'Pilotos | Sistema de flotilla',
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