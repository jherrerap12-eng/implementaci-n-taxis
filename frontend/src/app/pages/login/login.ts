import {
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly mensajeError = signal('');
  readonly contrasenaVisible = signal(false);

  readonly formularioLogin =
    this.formBuilder.nonNullable.group({
      correo: [
        '',
        [
          Validators.required,
          Validators.email,
        ],
      ],
      contrasena: [
        '',
        Validators.required,
      ],
    });

  alternarVisibilidadContrasena(): void {
    this.contrasenaVisible.update(
      (visible) => !visible,
    );
  }

  iniciarSesion(): void {
    if (
      this.formularioLogin.invalid ||
      this.cargando()
    ) {
      this.formularioLogin.markAllAsTouched();
      return;
    }

    const { correo, contrasena } =
      this.formularioLogin.getRawValue();

    this.cargando.set(true);
    this.mensajeError.set('');

    this.authService
      .login(correo, contrasena)
      .pipe(
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/dashboard');
        },
        error: () => {
          this.mensajeError.set(
            'Credenciales inválidas',
          );
        },
      });
  }
}
