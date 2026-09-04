import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { HistorialAhorroPiloto, ResumenAhorroPiloto } from '../../models/ahorro-pilotos.models';
import { AhorroPilotosService } from '../../services/ahorro-pilotos';

@Component({
  selector: 'app-ahorro-pilotos',
  imports: [ReactiveFormsModule],
  templateUrl: './ahorro-pilotos.html',
  styleUrl: './ahorro-pilotos.scss',
})
export class AhorroPilotos implements OnInit {
  private readonly servicio = inject(AhorroPilotosService);
  private readonly fb = inject(FormBuilder);
  readonly pilotos = signal<ResumenAhorroPiloto[]>([]);
  readonly historial = signal<HistorialAhorroPiloto | null>(null);
  readonly accion = signal<'AJUSTE' | 'RETIRO' | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');

  readonly formularioAjuste = this.fb.nonNullable.group({
    tipo: ['INGRESO' as 'INGRESO' | 'EGRESO'],
    monto: [0, [Validators.required, Validators.min(0.01), Validators.max(9_999_999_999.99)]],
    descripcion: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]],
  });
  readonly formularioRetiro = this.fb.nonNullable.group({
    monto: [0, [Validators.min(0.01), Validators.max(9_999_999_999.99)]],
    descripcion: ['', Validators.maxLength(1000)],
    liquidarTodo: [false],
  });

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar().pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (r) => this.pilotos.set(r.data),
      error: (e) => this.mostrarError(e, 'No fue posible cargar los ahorros'),
    });
  }

  verMovimientos(piloto: ResumenAhorroPiloto): void {
    this.limpiar();
    this.servicio.obtenerMovimientos(piloto.id).subscribe({
      next: (r) => this.historial.set(r.data),
      error: (e) => this.mostrarError(e, 'No fue posible cargar el historial'),
    });
  }

  abrirAccion(piloto: ResumenAhorroPiloto, accion: 'AJUSTE' | 'RETIRO'): void {
    this.verMovimientos(piloto);
    this.accion.set(accion);
    this.formularioAjuste.reset({ tipo: 'INGRESO', monto: 0, descripcion: '' });
    this.formularioRetiro.reset({ monto: 0, descripcion: '', liquidarTodo: false });
  }

  cerrarPanel(): void { this.historial.set(null); this.accion.set(null); }

  guardarAjuste(): void {
    const actual = this.historial();
    if (!actual || this.formularioAjuste.invalid) { this.formularioAjuste.markAllAsTouched(); return; }
    this.procesar(this.servicio.registrarAjuste(actual.piloto.id, this.formularioAjuste.getRawValue()));
  }

  guardarRetiro(): void {
    const actual = this.historial();
    const datos = this.formularioRetiro.getRawValue();
    if (!actual || (!datos.liquidarTodo && this.formularioRetiro.controls.monto.invalid)) {
      this.formularioRetiro.markAllAsTouched(); return;
    }
    this.procesar(this.servicio.registrarRetiro(actual.piloto.id, {
      liquidarTodo: datos.liquidarTodo,
      ...(datos.liquidarTodo ? {} : { monto: datos.monto }),
      descripcion: datos.descripcion,
    }));
  }

  private procesar(operacion: ReturnType<AhorroPilotosService['registrarRetiro']>): void {
    const pilotoId = this.historial()!.piloto.id;
    this.guardando.set(true); this.limpiar();
    operacion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (r) => { this.mensaje.set(r.message); this.accion.set(null); this.cargar(); this.servicio.obtenerMovimientos(pilotoId).subscribe(x => this.historial.set(x.data)); },
      error: (e) => this.mostrarError(e, 'No fue posible registrar el movimiento'),
    });
  }

  dinero(valor: number): string { return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(valor); }
  fecha(valor: string | null): string { return valor ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor)) : 'Sin movimientos'; }
  etiqueta(tipo: string): string { return tipo.replaceAll('_', ' '); }
  private limpiar(): void { this.mensaje.set(''); this.error.set(''); }
  private mostrarError(e: any, respaldo: string): void { this.error.set(e?.error?.message || respaldo); }
}
