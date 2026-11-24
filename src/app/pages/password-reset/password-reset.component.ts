import { BRAND } from '../../core/brand';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

/** El token llega en el fragmento (#token=...), que nunca se envía al servidor web. */
export function tokenFromFragment(fragment: string | null): string {
  return new URLSearchParams(fragment ?? '').get('token') ?? '';
}

@Component({
  standalone: true,
  imports: [BrandLogoComponent, FormsModule, RouterLink],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div class="w-full max-w-md">
        <div class="mb-6 flex flex-col items-center gap-2">
          <app-brand-logo [size]="44" [showProduct]="true" />
          <p class="text-sm text-slate-500">{{ brand.tagline }}</p>
        </div>
        <section class="card p-8">
          <h1 class="page-title">Nueva contraseña</h1>
          @if (done()) {
            <p role="status" class="alert-success mt-6">Contraseña actualizada. Por seguridad cerramos las sesiones abiertas.</p>
            <a routerLink="/login" class="btn-primary mt-6 w-full">Iniciar sesión</a>
          } @else if (!token) {
            <p role="alert" class="alert-error mt-6">El enlace no es válido. Solicita uno nuevo.</p>
            <a routerLink="/forgot-password" class="btn-primary mt-6 w-full">Solicitar enlace</a>
          } @else {
            <p class="page-subtitle">Elige una contraseña de al menos 12 caracteres.</p>
            <form class="mt-6 space-y-5" (ngSubmit)="submit()" #f="ngForm">
              <div>
                <label for="password" class="form-label">Contraseña nueva</label>
                <input id="password" class="form-control" type="password" name="password" [(ngModel)]="password" required minlength="12" maxlength="256" autocomplete="new-password">
              </div>
              <div>
                <label for="confirm" class="form-label">Confirmar contraseña</label>
                <input id="confirm" class="form-control" type="password" name="confirm" [(ngModel)]="confirm" required autocomplete="new-password">
              </div>
              @if (error()) { <p role="alert" class="alert-error">{{ error() }}</p> }
              <button type="submit" class="btn-primary w-full" [disabled]="busy() || f.invalid">
                {{ busy() ? 'Guardando…' : 'Guardar contraseña' }}
              </button>
            </form>
          }
        </section>
      </div>
    </main>`,
})
export class PasswordResetComponent {
  readonly brand = BRAND;
  private readonly auth = inject(AuthService);
  readonly token = tokenFromFragment(inject(ActivatedRoute).snapshot.fragment);
  password = '';
  confirm = '';
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly error = signal('');

  submit(): void {
    if (this.password !== this.confirm) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.auth.resetPassword(this.token, this.password).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => this.done.set(true),
      error: err => this.error.set(err?.status === 400
        ? 'El enlace venció o ya se usó. Solicita uno nuevo.'
        : err?.status === 422 ? 'La contraseña debe tener al menos 12 caracteres.'
        : 'No fue posible actualizar la contraseña.'),
    });
  }
}
