import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { CatalogoComponente } from '../../models/catalogo-componentes.models';
import {
  ComponenteUnidad,
  InstalarComponenteRequest,
} from '../../models/componentes-unidad.models';
import { CatalogoComponentesService } from '../../services/catalogo-componentes';
import { ComponentesUnidadService } from '../../services/componentes-unidad';
import { Unidad, UnidadesService } from '../../services/unidades';

@Component({
  selector: 'app-componentes-unidad',
  imports: [ReactiveFormsModule],
  templateUrl: './componentes-unidad.html',
  styleUrl: './componentes-unidad.scss',
})
export class ComponentesUnidad implements OnInit {
  private readonly servicio = inject(ComponentesUnidadService);
  private readonly catalogoService = inject(CatalogoComponentesService);
  private readonly unidadesService = inject(UnidadesService);
  private readonly formBuilder = inject(FormBuilder);

  readonly componentes = signal<ComponenteUnidad[]>([]);
  readonly unidades = signal<Unidad[]>([]);
  readonly catalogo = signal<CatalogoComponente[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mostrarInstalacion = signal(false);
  readonly componenteRetirando = signal<ComponenteUnidad | null>(null);
  readonly componenteReemplazando = signal<ComponenteUnidad | null>(null);
  readonly mensajeExito = signal('');
  readonly mensajeError = signal('');
  readonly fechaActual = this.obtenerFechaActual();

  readonly formularioInstalacion = this.formBuilder.group({
    unidadId: this.formBuilder.control<number | null>(null, Validators.required),
    catalogoComponenteId: this.formBuilder.control<number | null>(null, Validators.required),
    marca: ['', [Validators.required, Validators.maxLength(100)]],
    modelo: ['', [Validators.required, Validators.maxLength(100)]],
    numeroSerie: ['', Validators.maxLength(120)],
    posicion: ['', Validators.maxLength(80)],
    posicionesCatalogoIds: this.formBuilder.nonNullable.control<number[]>([]),
    cantidad: this.formBuilder.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    fechaInstalacion: [this.fechaActual, Validators.required],
    kilometrajeInstalacion: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    vidaUtilMeses: this.formBuilder.control<number | null>(null, Validators.min(1)),
    vidaUtilKm: this.formBuilder.control<number | null>(null, Validators.min(1)),
    alertaDiasAntes: this.formBuilder.control<number | null>(null, Validators.min(0)),
    alertaKmAntes: this.formBuilder.control<number | null>(null, Validators.min(0)),
  });

  readonly formularioRetiro = this.formBuilder.group({
    fechaRetiro: [this.fechaActual, Validators.required],
    kilometrajeRetiro: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    motivoRetiro: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]],
  });

  readonly formularioReemplazo = this.formBuilder.group({
    fechaRetiro: [this.fechaActual, Validators.required],
    kilometrajeRetiro: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    motivoRetiro: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]],
    observacionesRetiro: ['', Validators.maxLength(2000)],
    marca: ['', [Validators.required, Validators.maxLength(100)]],
    modelo: ['', [Validators.required, Validators.maxLength(100)]],
    numeroSerie: ['', Validators.maxLength(120)],
    fechaInstalacion: [this.fechaActual, Validators.required],
    kilometrajeInstalacion: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    vidaUtilMeses: this.formBuilder.control<number | null>(null, Validators.min(1)),
    vidaUtilKm: this.formBuilder.control<number | null>(null, Validators.min(1)),
    alertaDiasAntes: this.formBuilder.control<number | null>(null, Validators.min(0)),
    alertaKmAntes: this.formBuilder.control<number | null>(null, Validators.min(0)),
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    forkJoin({
      componentes: this.servicio.listar(),
      unidades: this.unidadesService.obtenerUnidades(),
      catalogo: this.catalogoService.listar(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ componentes, unidades, catalogo }) => {
          this.componentes.set(componentes.data);
          this.unidades.set(unidades.data);
          this.catalogo.set(catalogo.data.filter((item) => item.activo));
        },
        error: (error) =>
          this.mostrarError(error, 'No fue posible cargar los componentes instalados'),
      });
  }

  abrirInstalacion(): void {
    this.formularioInstalacion.reset({
      unidadId: null,
      catalogoComponenteId: null,
      marca: '',
      modelo: '',
      numeroSerie: '',
      posicion: '',
      posicionesCatalogoIds: [],
      cantidad: 1,
      fechaInstalacion: this.fechaActual,
      kilometrajeInstalacion: null,
      vidaUtilMeses: null,
      vidaUtilKm: null,
      alertaDiasAntes: null,
      alertaKmAntes: null,
    });
    this.limpiarMensajes();
    this.mostrarInstalacion.set(true);
  }

  seleccionarUnidad(): void {
    const unidad = this.unidades().find(
      (item) => item.id === this.formularioInstalacion.controls.unidadId.value,
    );
    if (unidad) {
      this.formularioInstalacion.controls.kilometrajeInstalacion.setValue(
        unidad.kilometrajeActual,
      );
    }
    this.formularioInstalacion.controls.posicionesCatalogoIds.setValue([]);
  }

  seleccionarCatalogo(): void {
    this.formularioInstalacion.controls.posicionesCatalogoIds.setValue([]);
    if (this.catalogoSeleccionado()?.modoInstalacion === 'POSICIONADO') {
      this.formularioInstalacion.controls.cantidad.setValue(1);
      this.formularioInstalacion.controls.posicion.setValue('');
      this.formularioInstalacion.controls.numeroSerie.setValue('');
    }
  }

  catalogoSeleccionado(): CatalogoComponente | undefined {
    return this.catalogo().find(
      (item) =>
        item.id ===
        this.formularioInstalacion.controls.catalogoComponenteId.value,
    );
  }

  posicionOcupada(posicionId: number): boolean {
    const unidadId = this.formularioInstalacion.controls.unidadId.value;
    const catalogoId =
      this.formularioInstalacion.controls.catalogoComponenteId.value;

    return this.componentes().some(
      (componente) =>
        componente.estado === 'INSTALADO' &&
        componente.unidad.id === unidadId &&
        componente.catalogoComponente.id === catalogoId &&
        componente.posicionCatalogoId === posicionId,
    );
  }

  alternarPosicion(posicionId: number, seleccionada: boolean): void {
    const control =
      this.formularioInstalacion.controls.posicionesCatalogoIds;
    const actuales = control.value;
    control.setValue(
      seleccionada
        ? [...new Set([...actuales, posicionId])]
        : actuales.filter((id) => id !== posicionId),
    );
  }

  colorNivelRiesgo(
    nivel: 'VERDE' | 'NARANJA' | 'AMARILLO' | 'ROJO',
  ): string {
    return {
      VERDE: '#16a34a',
      NARANJA: '#ea580c',
      AMARILLO: '#ca8a04',
      ROJO: '#dc2626',
    }[nivel];
  }

  guardarInstalacion(): void {
    if (this.formularioInstalacion.invalid) {
      this.formularioInstalacion.markAllAsTouched();
      return;
    }

    const catalogo = this.catalogoSeleccionado();
    if (
      catalogo?.modoInstalacion === 'POSICIONADO' &&
      this.formularioInstalacion.controls.posicionesCatalogoIds.value.length === 0
    ) {
      this.mensajeError.set('Selecciona al menos una posición');
      return;
    }

    const valor = this.formularioInstalacion.getRawValue();
    const datos: InstalarComponenteRequest = {
      unidadId: valor.unidadId!,
      catalogoComponenteId: valor.catalogoComponenteId!,
      marca: valor.marca?.trim() ?? '',
      modelo: valor.modelo?.trim() ?? '',
      numeroSerie:
        catalogo?.modoInstalacion === 'POSICIONADO'
          ? null
          : valor.numeroSerie?.trim() || null,
      posicion: null,
      posicionesCatalogoIds: valor.posicionesCatalogoIds,
      cantidad:
        catalogo?.modoInstalacion === 'POSICIONADO' ? 1 : valor.cantidad,
      fechaInstalacion: valor.fechaInstalacion ?? this.fechaActual,
      kilometrajeInstalacion: valor.kilometrajeInstalacion!,
      vidaUtilMeses: valor.vidaUtilMeses,
      vidaUtilKm: valor.vidaUtilKm,
      alertaDiasAntes: valor.alertaDiasAntes,
      alertaKmAntes: valor.alertaKmAntes,
    };

    this.guardando.set(true);
    this.limpiarMensajes();
    this.servicio
      .instalar(datos)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(respuesta.message);
          this.mostrarInstalacion.set(false);
          this.cargarDatos();
        },
        error: (error) =>
          this.mostrarError(error, 'No fue posible instalar el componente'),
      });
  }

  abrirRetiro(componente: ComponenteUnidad): void {
    this.componenteReemplazando.set(null);
    this.componenteRetirando.set(componente);
    this.formularioRetiro.reset({
      fechaRetiro: this.fechaActual,
      kilometrajeRetiro: componente.unidad.kilometrajeActual,
      motivoRetiro: '',
    });
    this.limpiarMensajes();
  }

  abrirReemplazo(componente: ComponenteUnidad): void {
    this.componenteRetirando.set(null);
    this.componenteReemplazando.set(componente);
    this.formularioReemplazo.reset({
      fechaRetiro: this.fechaActual,
      kilometrajeRetiro: componente.unidad.kilometrajeActual,
      motivoRetiro: '',
      observacionesRetiro: '',
      marca: '',
      modelo: '',
      numeroSerie: '',
      fechaInstalacion: this.fechaActual,
      kilometrajeInstalacion: componente.unidad.kilometrajeActual,
      vidaUtilMeses: null,
      vidaUtilKm: null,
      alertaDiasAntes: null,
      alertaKmAntes: null,
    });
    this.limpiarMensajes();
  }

  guardarReemplazo(): void {
    const componente = this.componenteReemplazando();
    if (!componente || this.formularioReemplazo.invalid) {
      this.formularioReemplazo.markAllAsTouched();
      return;
    }

    const valor = this.formularioReemplazo.getRawValue();
    this.guardando.set(true);
    this.limpiarMensajes();
    this.servicio
      .reemplazar(componente.id, {
        fechaRetiro: valor.fechaRetiro ?? this.fechaActual,
        kilometrajeRetiro: valor.kilometrajeRetiro!,
        motivoRetiro: valor.motivoRetiro?.trim() ?? '',
        observacionesRetiro: valor.observacionesRetiro?.trim() || null,
        marca: valor.marca?.trim() ?? '',
        modelo: valor.modelo?.trim() ?? '',
        numeroSerie: valor.numeroSerie?.trim() || null,
        fechaInstalacion: valor.fechaInstalacion ?? this.fechaActual,
        kilometrajeInstalacion: valor.kilometrajeInstalacion!,
        vidaUtilMeses: valor.vidaUtilMeses,
        vidaUtilKm: valor.vidaUtilKm,
        alertaDiasAntes: valor.alertaDiasAntes,
        alertaKmAntes: valor.alertaKmAntes,
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(respuesta.message);
          this.componenteReemplazando.set(null);
          this.cargarDatos();
        },
        error: (error) =>
          this.mostrarError(error, 'No fue posible reemplazar el componente'),
      });
  }

  guardarRetiro(): void {
    const componente = this.componenteRetirando();
    if (!componente || this.formularioRetiro.invalid) {
      this.formularioRetiro.markAllAsTouched();
      return;
    }

    const valor = this.formularioRetiro.getRawValue();
    this.guardando.set(true);
    this.limpiarMensajes();
    this.servicio
      .retirar(componente.id, {
        fechaRetiro: valor.fechaRetiro ?? this.fechaActual,
        kilometrajeRetiro: valor.kilometrajeRetiro!,
        motivoRetiro: valor.motivoRetiro?.trim() ?? '',
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(respuesta.message);
          this.componenteRetirando.set(null);
          this.cargarDatos();
        },
        error: (error) =>
          this.mostrarError(error, 'No fue posible retirar el componente'),
      });
  }

  private obtenerFechaActual(): string {
    const fecha = new Date();
    return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  }

  private limpiarMensajes(): void {
    this.mensajeExito.set('');
    this.mensajeError.set('');
  }

  private mostrarError(error: { error?: { message?: string } }, mensaje: string): void {
    this.mensajeError.set(error.error?.message || mensaje);
  }
}
