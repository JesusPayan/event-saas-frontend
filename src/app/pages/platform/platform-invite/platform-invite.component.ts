import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { BRAND } from '../../../core/brand';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo';
import { PlatformService } from '../../../services/platform.service';
import { tokenFromFragment } from '../../password-reset/password-reset.component';

/** ROLES-01: aceptar una invitación a un rol de plataforma (promotor, administrador). */
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
          @if (loading()) {
            <div class="h-24 animate-pulse rounded bg-gray-100" aria-busy="true"></div>
          } @else if (accepted()) {
            <h1 class="page-title">¡Listo!</h1>
            <p role="status" class="alert-success mt-6">Ya tienes el rol de <strong>{{ info()?.role_label }}</strong>.</p>
            <a routerLink="/login" class="btn-primary mt-6 w-full">Iniciar sesión</a>
          } @else if (info(); as inv) {
            <h1 class="page-title">Invitación a {{ brand.product }}</h1>
            <p class="page-subtitle">Te invitaron como <strong>{{ inv.role_label }}</strong> con el correo <strong>{{ inv.email }}</strong>.</p>
            <form class="mt-6 space-y-5" (ngSubmit)="accept()" #f="ngForm">
              <div>
                <label for="password" class="form-label">{{ inv.user_exists ? 'Contraseña de tu cuenta' : 'Crea una contraseña' }}</label>
                <input id="password" class="form-control" type="password" name="password" [(ngModel)]="password" required
                  [attr.minlength]="inv.user_exists ? null : 12" [autocomplete]="inv.user_exists ? 'current-password' : 'new-password'">
                @if (!inv.user_exists) { <p class="form-hint">Mínimo 12 caracteres.</p> }
              </div>
              @if (error()) { <p role="alert" class="alert-error">{{ error() }}</p> }
              <button type="submit" class="btn-primary w-full" [disabled]="busy() || f.invalid">Aceptar invitación</button>
            </form>
          } @else {
            <h1 class="page-title">Invitación no válida</h1>
            <p role="alert" class="alert-error mt-6">El enlace venció, ya se usó o fue cancelado.</p>
            <a routerLink="/login" class="btn-secondary mt-6 w-full">Ir al inicio de sesión</a>
          }
        </section>
      </div>
    </main>`,
})
export class PlatformInviteComponent {
  readonly brand = BRAND;
  private readonly platform = inject(PlatformService);
  private readonly token = tokenFromFragment(inject(ActivatedRoute).snapshot.fragment);
  readonly info = signal<{ email: string; role_label: string; user_exists: boolean } | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly accepted = signal(false);
  readonly error = signal('');
  password = '';

  constructor() {
    if (!this.token) { this.loading.set(false); return; }
    firstValueFrom(this.platform.lookupInvitation(this.token))
      .then(info => this.info.set(info)).catch(() => this.info.set(null))
      .finally(() => this.loading.set(false));
  }

  async accept(): Promise<void> {
    if (!this.token) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.platform.acceptInvitation(this.token, this.password));
      this.accepted.set(true);
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? err.error?.error : '';
      this.error.set(code === 'invalid_credentials' ? 'La contraseña no coincide con tu cuenta.'
        : code === 'invalid_password' ? 'La contraseña debe tener al menos 12 caracteres.'
        : 'No fue posible aceptar la invitación.');
    } finally {
      this.busy.set(false);
    }
  }
}
