import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({ standalone: true, imports: [FormsModule, RouterLink], templateUrl: './register.component.html' })
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  company = '';
  slug = '';
  email = '';
  password = '';
  slugTouched = false;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal(false);

  /** Propone un identificador a partir del nombre mientras el usuario no lo edite. */
  suggestSlug(): void {
    if (this.slugTouched) return;
    this.slug = this.company.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  }

  submit(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.register(this.email.trim(), this.password, this.company.trim(), this.slug).pipe(
      finalize(() => this.busy.set(false))
    ).subscribe({
      next: () => this.success.set(true),
      error: (err: HttpErrorResponse) => this.error.set(
        err.status === 409 ? 'Ese correo o identificador ya está registrado.'
          : err.status === 429 ? 'Demasiados intentos. Espera e inténtalo más tarde.'
          : 'No fue posible crear la empresa. Revisa los datos.'),
    });
  }
}
