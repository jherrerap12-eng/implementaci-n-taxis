import { Component, inject, OnInit, signal } from '@angular/core';

import {
  CriterioVidaUtil,
  IndicadoresMantenimiento,
} from '../../models/indicadores-mantenimiento.models';
import { IndicadoresMantenimientoService } from '../../services/indicadores-mantenimiento';

@Component({
  selector: 'app-indicadores-mantenimiento',
  templateUrl: './indicadores-mantenimiento.html',
  styleUrl: './indicadores-mantenimiento.scss',
})
export class IndicadoresMantenimientoPage implements OnInit {
  private readonly servicio = inject(IndicadoresMantenimientoService);

  readonly datos = signal<IndicadoresMantenimiento | null>(null);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');

  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.servicio.obtener().subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta.data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al consultar indicadores de mantenimiento:', error);
        this.datos.set(null);
        this.mensajeError.set(error.error?.message || 'No fue posible consultar los indicadores');
        this.cargando.set(false);
      },
    });
  }

  numero(valor: number | null, decimales = 0): string {
    if (valor === null || !Number.isFinite(valor)) return 'No disponible';
    return new Intl.NumberFormat('es-GT', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(valor);
  }

  mensajeMuestra(criterio: CriterioVidaUtil): string {
    if (criterio.interpretacion === 'NO_HAY_DATOS_SUFICIENTES') return 'No hay datos suficientes';
    if (criterio.interpretacion === 'MUESTRA_LIMITADA') return 'Muestra limitada';
    return 'Datos suficientes';
  }

  claseMuestra(criterio: CriterioVidaUtil): string {
    return criterio.interpretacion.toLowerCase().replaceAll('_', '-');
  }
}
