import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { CatalogoComponente } from '../../models/catalogo-componentes.models';
import {
  ComponenteUnidad,
  HistorialTecnicoComponente,
  InstalarComponenteRequest,
} from '../../models/componentes-unidad.models';
import { CatalogoComponentesService } from '../../services/catalogo-componentes';
import { ComponentesUnidadService } from '../../services/componentes-unidad';
import { HistorialComponentesPdfService } from '../../services/historial-componentes-pdf';
import {
  Mantenimiento,
  MantenimientosService,
} from '../../services/mantenimientos';
import { Unidad, UnidadesService } from '../../services/unidades';

@Component({
  selector: 'app-componentes-unidad',
  imports: [ReactiveFormsModule],
  templateUrl: './componentes-unidad.html',
  styleUrl: './componentes-unidad.scss',
  styles: [`
    .opciones-mantenimiento { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-bottom: 18px; }
    .opcion-mantenimiento { display: flex; min-height: 44px; align-items: center; gap: 9px; cursor: pointer; }
    .opcion-mantenimiento input { width: auto; }
    .aviso-mantenimiento { margin-bottom: 16px; border-radius: 8px; padding: 11px 13px; background: #fff7ed; color: #9a3412; }
    .nota-costo { margin-top: 14px; font-size: 13px; font-weight: 600; }
    .selector-vista { display: inline-flex; margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 9px; padding: 3px; background: white; }
    .selector-vista button { min-height: 40px; padding: 8px 18px; background: transparent; color: #475569; }
    .selector-vista button.activo { background: #2563eb; color: white; }
    .panel-historial-tecnico { display: grid; gap: 20px; }
    .encabezado-historial, .filtros-historial { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: white; }
    .encabezado-historial { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .boton-exportar { min-height: 44px; white-space: nowrap; }
    .filtros-historial { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .tabla-historial td { vertical-align: top; white-space: normal; }
    .tabla-historial small { color: #64748b; }
    @media (max-width: 900px) {
      .filtros-historial { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 600px) {
      .opciones-mantenimiento { display: grid; gap: 4px; }
      .opcion-mantenimiento { min-height: 48px; }
      .selector-vista { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
      .selector-vista button { min-height: 44px; }
      .filtros-historial { grid-template-columns: 1fr; }
      .encabezado-historial { align-items: stretch; flex-direction: column; }
      .boton-exportar { width: 100%; }
    }
  `],
})
export class ComponentesUnidad implements OnInit {
  private readonly servicio = inject(ComponentesUnidadService);
  private readonly catalogoService = inject(CatalogoComponentesService);
  private readonly unidadesService = inject(UnidadesService);
  private readonly mantenimientosService = inject(MantenimientosService);
  private readonly historialPdfService = inject(HistorialComponentesPdfService);
  private readonly formBuilder = inject(FormBuilder);

  readonly componentes = signal<ComponenteUnidad[]>([]);
  readonly historial = signal<HistorialTecnicoComponente[]>([]);
  readonly vistaActiva = signal<'INSTALADOS' | 'HISTORIAL'>('INSTALADOS');
  readonly filtroUnidad = signal<number | null>(null);
  readonly filtroComponente = signal<number | null>(null);
  readonly filtroAccion = signal<'RETIRO' | 'REEMPLAZO' | null>(null);
  readonly filtroFechaRetiro = signal('');
  readonly historialFiltrado = computed(() =>
    this.historial().filter((registro) =>
      (this.filtroUnidad() === null || registro.unidad.id === this.filtroUnidad()) &&
      (this.filtroComponente() === null || registro.componente.catalogoId === this.filtroComponente()) &&
      (this.filtroAccion() === null || registro.mantenimiento?.accion === this.filtroAccion()) &&
      (!this.filtroFechaRetiro() || registro.retiro.fecha?.slice(0, 10) === this.filtroFechaRetiro()),
    ),
  );
  readonly unidadesHistorial = computed(() =>
    [...new Map(this.historial().map((item) => [item.unidad.id, item.unidad])).values()]
      .sort((a, b) => a.codigo.localeCompare(b.codigo)),
  );
  readonly componentesHistorial = computed(() =>
    [...new Map(this.historial().map((item) => [item.componente.catalogoId, {
      id: item.componente.catalogoId,
      nombre: item.componente.nombre,
    }])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );
  readonly unidades = signal<Unidad[]>([]);
  readonly catalogo = signal<CatalogoComponente[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mostrarInstalacion = signal(false);
  readonly componenteRetirando = signal<ComponenteUnidad | null>(null);
  readonly componenteReemplazando = signal<ComponenteUnidad | null>(null);
  readonly mantenimientosActivos = signal<Mantenimiento[]>([]);
  readonly cargandoMantenimientos = signal(false);
  readonly exportandoPdf = signal(false);
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
    tipoMantenimiento: this.formBuilder.nonNullable.control<'EXISTENTE' | 'NUEVO'>('NUEVO'),
    mantenimientoId: this.formBuilder.control<number | null>(null),
    mantenimientoFechaInicio: [this.fechaActual],
    mantenimientoDescripcion: [''],
    mantenimientoCosto: this.formBuilder.control<number | null>(null, Validators.min(0)),
    fechaRetiro: [this.fechaActual, Validators.required],
    kilometrajeRetiro: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    motivoRetiro: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]],
    observaciones: ['', Validators.maxLength(2000)],
  });

  readonly formularioReemplazo = this.formBuilder.group({
    tipoMantenimiento: this.formBuilder.nonNullable.control<'EXISTENTE' | 'NUEVO'>('NUEVO'),
    mantenimientoId: this.formBuilder.control<number | null>(null),
    mantenimientoFechaInicio: [this.fechaActual],
    mantenimientoDescripcion: [''],
    mantenimientoCosto: this.formBuilder.control<number | null>(null, Validators.min(0)),
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
      historial: this.servicio.obtenerHistorial(),
      unidades: this.unidadesService.obtenerUnidades(),
      catalogo: this.catalogoService.listar(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ componentes, historial, unidades, catalogo }) => {
          this.componentes.set(componentes.data);
          this.historial.set(historial.data);
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

  formatearCosto(costo: string): string {
    return Number(costo).toFixed(2);
  }

  formatearNumero(valor: number | null): string {
    return valor === null ? 'No disponible' : new Intl.NumberFormat('es-GT').format(valor);
  }

  cambiarFiltroUnidad(valor: string): void {
    this.filtroUnidad.set(valor ? Number(valor) : null);
  }

  cambiarFiltroComponente(valor: string): void {
    this.filtroComponente.set(valor ? Number(valor) : null);
  }

  cambiarFiltroAccion(valor: string): void {
    this.filtroAccion.set(
      valor === 'RETIRO' || valor === 'REEMPLAZO' ? valor : null,
    );
  }

  async exportarHistorialPdf(): Promise<void> {
    const registros = this.historialFiltrado();
    if (registros.length === 0 || this.exportandoPdf()) return;

    this.exportandoPdf.set(true);
    this.limpiarMensajes();
    try {
      const unidad = this.unidadesHistorial().find(
        (item) => item.id === this.filtroUnidad(),
      );
      const componente = this.componentesHistorial().find(
        (item) => item.id === this.filtroComponente(),
      );
      await this.historialPdfService.generar(registros, {
        unidad: unidad?.codigo ?? '',
        componente: componente?.nombre ?? '',
        accion: this.filtroAccion() ?? '',
        fechaRetiro: this.filtroFechaRetiro(),
      });
    } catch (error) {
      console.error('Error al exportar historial técnico:', error);
      this.mensajeError.set('No fue posible generar el PDF del historial');
    } finally {
      this.exportandoPdf.set(false);
    }
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
      tipoMantenimiento: 'NUEVO',
      mantenimientoId: null,
      mantenimientoFechaInicio: this.fechaActual,
      mantenimientoDescripcion: `Retiro de ${componente.catalogoComponente.nombre}${componente.posicion ? ` - ${componente.posicion}` : ''}`,
      mantenimientoCosto: null,
      fechaRetiro: this.fechaActual,
      kilometrajeRetiro: componente.unidad.kilometrajeActual,
      motivoRetiro: '',
      observaciones: '',
    });
    this.limpiarMensajes();
    this.cargarMantenimientosActivos(componente.unidad.id, 'RETIRO');
  }

  abrirReemplazo(componente: ComponenteUnidad): void {
    this.componenteRetirando.set(null);
    this.componenteReemplazando.set(componente);
    this.formularioReemplazo.reset({
      tipoMantenimiento: 'NUEVO',
      mantenimientoId: null,
      mantenimientoFechaInicio: this.fechaActual,
      mantenimientoDescripcion: `Reemplazo de ${componente.catalogoComponente.nombre}${componente.posicion ? ` - ${componente.posicion}` : ''}`,
      mantenimientoCosto: null,
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
    this.cargarMantenimientosActivos(componente.unidad.id, 'REEMPLAZO');
  }

  private cargarMantenimientosActivos(
    unidadId: number,
    flujo: 'RETIRO' | 'REEMPLAZO',
  ): void {
    this.cargandoMantenimientos.set(true);
    this.mantenimientosActivos.set([]);
    this.mantenimientosService
      .obtenerActivosPorUnidad(unidadId)
      .pipe(finalize(() => this.cargandoMantenimientos.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.mantenimientosActivos.set(respuesta.data);
          const primero = respuesta.data[0];
          if (primero) {
            const formulario = flujo === 'RETIRO'
              ? this.formularioRetiro
              : this.formularioReemplazo;
            formulario.patchValue({
              tipoMantenimiento: 'EXISTENTE',
              mantenimientoId: primero.id,
            });
          }
        },
        error: (error) =>
          this.mostrarError(error, 'No fue posible consultar los mantenimientos activos'),
      });
  }

  seleccionarTipoMantenimiento(
    tipo: 'EXISTENTE' | 'NUEVO',
    flujo: 'RETIRO' | 'REEMPLAZO' = 'REEMPLAZO',
  ): void {
    const formulario = flujo === 'RETIRO'
      ? this.formularioRetiro
      : this.formularioReemplazo;
    formulario.controls.tipoMantenimiento.setValue(tipo);
    if (tipo === 'EXISTENTE' && !formulario.controls.mantenimientoId.value) {
      formulario.controls.mantenimientoId.setValue(
        this.mantenimientosActivos()[0]?.id ?? null,
      );
    }
  }

  guardarReemplazo(): void {
    const componente = this.componenteReemplazando();
    if (!componente || this.formularioReemplazo.invalid) {
      this.formularioReemplazo.markAllAsTouched();
      return;
    }

    const valor = this.formularioReemplazo.getRawValue();
    const mantenimiento = valor.tipoMantenimiento === 'EXISTENTE'
      ? valor.mantenimientoId
        ? { tipo: 'EXISTENTE' as const, mantenimientoId: valor.mantenimientoId }
        : null
      : valor.mantenimientoFechaInicio &&
          valor.mantenimientoDescripcion?.trim() &&
          valor.mantenimientoCosto !== null
        ? {
            tipo: 'NUEVO' as const,
            fechaInicio: valor.mantenimientoFechaInicio,
            descripcion: valor.mantenimientoDescripcion.trim(),
            costo: Number(valor.mantenimientoCosto),
          }
        : null;

    if (!mantenimiento) {
      this.mensajeError.set('Completa los datos del mantenimiento');
      return;
    }
    this.guardando.set(true);
    this.limpiarMensajes();
    this.servicio
      .reemplazar(componente.id, {
        mantenimiento,
        fechaRetiro: valor.fechaRetiro ?? this.fechaActual,
        kilometrajeRetiro: valor.kilometrajeRetiro!,
        motivoRetiro: valor.motivoRetiro?.trim() ?? '',
        observaciones: valor.observacionesRetiro?.trim() || null,
        nuevoComponente: {
          marca: valor.marca?.trim() ?? '',
          modelo: valor.modelo?.trim() ?? '',
          numeroSerie: valor.numeroSerie?.trim() || null,
          fechaInstalacion: valor.fechaInstalacion ?? this.fechaActual,
          kilometrajeInstalacion: valor.kilometrajeInstalacion!,
          vidaUtilMeses: valor.vidaUtilMeses,
          vidaUtilKm: valor.vidaUtilKm,
          alertaDiasAntes: valor.alertaDiasAntes,
          alertaKmAntes: valor.alertaKmAntes,
        },
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
    const mantenimiento = valor.tipoMantenimiento === 'EXISTENTE'
      ? valor.mantenimientoId
        ? { tipo: 'EXISTENTE' as const, mantenimientoId: valor.mantenimientoId }
        : null
      : valor.mantenimientoFechaInicio &&
          valor.mantenimientoDescripcion?.trim() &&
          valor.mantenimientoCosto !== null
        ? {
            tipo: 'NUEVO' as const,
            fechaInicio: valor.mantenimientoFechaInicio,
            descripcion: valor.mantenimientoDescripcion.trim(),
            costo: Number(valor.mantenimientoCosto),
          }
        : null;

    if (!mantenimiento) {
      this.mensajeError.set('Completa los datos del mantenimiento');
      return;
    }
    this.guardando.set(true);
    this.limpiarMensajes();
    this.servicio
      .retirar(componente.id, {
        mantenimiento,
        fechaRetiro: valor.fechaRetiro ?? this.fechaActual,
        kilometrajeRetiro: valor.kilometrajeRetiro!,
        motivoRetiro: valor.motivoRetiro?.trim() ?? '',
        observaciones: valor.observaciones?.trim() || null,
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
