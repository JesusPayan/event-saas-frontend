import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div class="w-full max-w-md">
        <div class="mb-6 flex items-center justify-center gap-3">
          <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white" aria-hidden="true">E</span>
          <span class="text-xl font-bold text-gray-900">Eventos SaaS</span>
        </div>
        <section class="card p-8">
          <h1 class="page-title">Recuperar contraseña</h1>
          @if (sent()) {
            <p role="status" class="alert-success mt-6">
              Si existe una cuenta con <strong>{{ email }}</strong>, te enviamos un enlace para restablecer la contraseña.
              Revisa tu bandeja de entrada y la carpeta de spam. El enlace vence en una hora.
            </p>
          } @else {
            <p class="page-subtitle">Te enviaremos un enlace a tu correo para crear una contraseña nueva.</p>
            <form class="mt-6 space-y-5" (ngSubmit)="submit()" #f="ngForm">
              <div>
                <label for="email" class="form-label">Correo electrónico</label>
                <input id="email" class="form-control" type="email" name="email" [(ngModel)]="email" required email autocomplete="email">
              </div>
              @if (error()) { <p role="alert" class="alert-error">{{ error() }}</p> }
              <button type="submit" class="btn-primary w-full" [disabled]="busy() || f.invalid">
                {{ busy() ? 'Enviando…' : 'Enviar enlace' }}
              </button>
            </form>
          }
          <p class="mt-6 text-center text-sm text-gray-600"><a routerLink="/login" class="font-semibold">Volver al inicio de sesión</a></p>
        </section>
      </div>
    </main>`,
})
export class PasswordForgotComponent {
  private readonly auth = inject(AuthService);
  email = '';
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.auth.forgotPassword(this.email.trim()).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => this.sent.set(true),
      error: err => this.error.set(err?.status === 429
        ? 'Demasiadas solicitudes. Inténtalo más tarde.' : 'No fue posible enviar la solicitud. Intenta de nuevo.'),
    });
  }
}
