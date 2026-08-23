import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import {
  CatalogoComponente,
  GuardarCatalogoComponenteRequest,
} from '../../models/catalogo-componentes.models';
import { CatalogoComponentesService } from '../../services/catalogo-componentes';

const vidaUtilRequerida: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const meses = control.get('vidaUtilMesesDefault')?.value;
  const kilometros = control.get('vidaUtilKmDefault')?.value;
  return meses || kilometros ? null : { vidaUtilRequerida: true };
};

@Component({
  selector: 'app-catalogo-componentes',
  imports: [ReactiveFormsModule],
  templateUrl: './catalogo-componentes.html',
  styleUrl: './catalogo-componentes.scss',
})
export class CatalogoComponentes implements OnInit {
  private readonly servicio = inject(CatalogoComponentesService);
  private readonly formBuilder = inject(FormBuilder);

  readonly componentes = signal<CatalogoComponente[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly procesandoId = signal<number | null>(null);
  readonly mostrarFormulario = signal(false);
  readonly componenteEditandoId = signal<number | null>(null);
  readonly mensajeExito = signal('');
  readonly mensajeError = signal('');

  readonly formulario = this.formBuilder.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', Validators.maxLength(1000)],
      vidaUtilMesesDefault: this.formBuilder.control<number | null>(null, [
        Validators.min(1),
      ]),
      vidaUtilKmDefault: this.formBuilder.control<number | null>(null, [
        Validators.min(1),
      ]),
      alertaDiasAntesDefault: this.formBuilder.nonNullable.control(30, [
        Validators.required,
        Validators.min(0),
      ]),
      alertaKmAntesDefault: this.formBuilder.nonNullable.control(500, [
        Validators.required,
        Validators.min(0),
      ]),
      modoInstalacion: this.formBuilder.nonNullable.control<
        'INDIVIDUAL' | 'POSICIONADO'
      >('INDIVIDUAL'),
      posiciones: this.formBuilder.array<FormGroup> ([]),
    },
    { validators: vidaUtilRequerida },
  );

  get posiciones() {
    return this.formulario.controls.posiciones;
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.servicio
      .listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => this.componentes.set(respuesta.data),
        error: (error) =>
          this.mostrarError(error, 'No fue posible cargar el catálogo'),
      });
  }

  abrirNuevo(): void {
    this.componenteEditandoId.set(null);
    this.formulario.reset({
      nombre: '',
      descripcion: '',
      vidaUtilMesesDefault: null,
      vidaUtilKmDefault: null,
      alertaDiasAntesDefault: 30,
      alertaKmAntesDefault: 500,
      modoInstalacion: 'INDIVIDUAL',
    });
    this.posiciones.clear();
    this.limpiarMensajes();
    this.mostrarFormulario.set(true);
  }

  editar(componente: CatalogoComponente): void {
    this.posiciones.clear();
    componente.posiciones.forEach((posicion) =>
      this.posiciones.push(this.crearControlPosicion(posicion)),
    );
    this.componenteEditandoId.set(componente.id);
    this.formulario.reset({
      nombre: componente.nombre,
      descripcion: componente.descripcion ?? '',
      vidaUtilMesesDefault: componente.vidaUtilMesesDefault,
      vidaUtilKmDefault: componente.vidaUtilKmDefault,
      alertaDiasAntesDefault: componente.alertaDiasAntesDefault,
      alertaKmAntesDefault: componente.alertaKmAntesDefault,
      modoInstalacion: componente.modoInstalacion,
    });
    this.limpiarMensajes();
    this.mostrarFormulario.set(true);
  }

  agregarPosicion(): void {
    this.posiciones.push(
      this.crearControlPosicion({
        codigo: '',
        nombre: '',
        orden: this.posiciones.length + 1,
        activo: true,
      }),
    );
  }

  desactivarPosicion(indice: number): void {
    const control = this.posiciones.at(indice);
    if (control.controls['id']?.value) {
      control.controls['activo']?.setValue(false);
    } else {
      this.posiciones.removeAt(indice);
    }
  }

  cambiarModo(): void {
    if (this.formulario.controls.modoInstalacion.value === 'INDIVIDUAL') {
      this.posiciones.controls.forEach((control) =>
        control.controls['activo']?.setValue(false),
      );
    }
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.componenteEditandoId.set(null);
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (
      this.formulario.controls.modoInstalacion.value === 'POSICIONADO' &&
      !this.posiciones.controls.some(
        (control) => control.controls['activo']?.value,
      )
    ) {
      this.mensajeError.set(
        'Agrega al menos una posición activa para el componente',
      );
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: GuardarCatalogoComponenteRequest = {
      nombre: valores.nombre?.trim() ?? '',
      descripcion: valores.descripcion?.trim() || null,
      vidaUtilMesesDefault: valores.vidaUtilMesesDefault,
      vidaUtilKmDefault: valores.vidaUtilKmDefault,
      alertaDiasAntesDefault: valores.alertaDiasAntesDefault,
      alertaKmAntesDefault: valores.alertaKmAntesDefault,
      modoInstalacion: valores.modoInstalacion,
      posiciones: valores.posiciones.map((posicion) => ({
        ...(posicion['id'] ? { id: Number(posicion['id']) } : {}),
        codigo: String(posicion['codigo'] ?? '').trim().toUpperCase(),
        nombre: String(posicion['nombre'] ?? '').trim(),
        orden: Number(posicion['orden']),
        activo: Boolean(posicion['activo']),
      })),
    };
    const id = this.componenteEditandoId();

    this.guardando.set(true);
    this.limpiarMensajes();
    const operacion = id === null
      ? this.servicio.crear(datos)
      : this.servicio.actualizar(id, datos);

    operacion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (respuesta) => {
        this.mensajeExito.set(respuesta.message);
        this.cerrarFormulario();
        this.cargar();
      },
      error: (error) =>
        this.mostrarError(error, 'No fue posible guardar el componente'),
    });
  }

  private crearControlPosicion(posicion: {
    id?: number;
    codigo: string;
    nombre: string;
    orden: number;
    activo: boolean;
  }): FormGroup {
    return new FormGroup({
      id: new FormControl<number | null>(posicion.id ?? null),
      codigo: new FormControl(posicion.codigo, {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(60)],
      }),
      nombre: new FormControl(posicion.nombre, {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      orden: new FormControl(posicion.orden, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)],
      }),
      activo: new FormControl(posicion.activo, { nonNullable: true }),
    });
  }

  cambiarEstado(componente: CatalogoComponente): void {
    this.procesandoId.set(componente.id);
    this.limpiarMensajes();
    this.servicio
      .cambiarEstado(componente.id, !componente.activo)
      .pipe(finalize(() => this.procesandoId.set(null)))
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(respuesta.message);
          this.cargar();
        },
        error: (error) =>
          this.mostrarError(error, 'No fue posible cambiar el estado'),
      });
  }

  private limpiarMensajes(): void {
    this.mensajeExito.set('');
    this.mensajeError.set('');
  }

  private mostrarError(
    error: { error?: { message?: string } },
    mensaje: string,
  ): void {
    this.mensajeError.set(error.error?.message || mensaje);
  }
}
