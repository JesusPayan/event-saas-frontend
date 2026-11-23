import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({ standalone: true, imports: [FormsModule, RouterLink], templateUrl: './login.component.html' })
export class LoginComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Sesión restaurada tras recargar: no mostrar el login otra vez.
    if (this.auth.authenticated()) {
      void this.router.navigate([this.auth.tenant() ? '/dashboard' : '/tenants']);
    }
  }

  email = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');

  submit(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.email.trim(), this.password).pipe(
      switchMap(() => this.auth.loadMe()),
      finalize(() => this.busy.set(false))
    ).subscribe({
      next: () => void this.router.navigate(['/tenants']),
      error: (err: HttpErrorResponse) => this.error.set(
        err.status === 401 ? 'Correo o contraseña incorrectos.'
          : err.status === 429 ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'
          : err.status === 0 ? 'No se pudo conectar con el servidor.'
          : 'No fue posible iniciar sesión. Intenta de nuevo.'),
    });
  }
}
