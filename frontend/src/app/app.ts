import {
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuAbierto = signal(false);

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  cerrarSesion(): void {
    this.cerrarMenu();
    this.authService.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
}
