import { Routes } from '@angular/router';

import { Ingresos } from './pages/ingresos/ingresos';
import { Pilotos } from './pages/pilotos/pilotos';
import { RegistroDiarioComponent } from './pages/registro-diario/registro-diario';
import { ResumenDiarioComponent } from './pages/resumen-diario/resumen-diario';
import { Unidades } from './pages/unidades/unidades';

export const routes: Routes = [
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
    path: '',
    redirectTo: 'registro-diario',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'registro-diario',
  },
];