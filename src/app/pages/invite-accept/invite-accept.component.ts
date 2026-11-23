import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { tokenFromFragment } from '../password-reset/password-reset.component';

interface InvitationInfo { tenant_name: string | null; email: string; role: string; user_exists: boolean; expires_at: string; }

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', staff: 'Operativo', viewer: 'Solo lectura' };

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
          @if (loading()) {
            <div class="h-24 animate-pulse rounded bg-gray-100" aria-busy="true"></div>
          } @else if (accepted()) {
            <h1 class="page-title">¡Listo!</h1>
            <p role="status" class="alert-success mt-6">Ya eres parte de <strong>{{ info()?.tenant_name }}</strong>.</p>
            <a routerLink="/login" class="btn-primary mt-6 w-full">Iniciar sesión</a>
          } @else if (info(); as inv) {
            <h1 class="page-title">Únete a {{ inv.tenant_name }}</h1>
            <p class="page-subtitle">Te invitaron como <strong>{{ roleLabel(inv.role) }}</strong> con el correo <strong>{{ inv.email }}</strong>.</p>
            <form class="mt-6 space-y-5" (ngSubmit)="accept()" #f="ngForm">
              <div>
                <label for="password" class="form-label">{{ inv.user_exists ? 'Contraseña de tu cuenta' : 'Crea una contraseña' }}</label>
                <input id="password" class="form-control" type="password" name="password" [(ngModel)]="password" required
                  [attr.minlength]="inv.user_exists ? null : 12" [autocomplete]="inv.user_exists ? 'current-password' : 'new-password'">
                @if (!inv.user_exists) { <p class="form-hint">Mínimo 12 caracteres.</p> }
              </div>
              @if (error()) { <p role="alert" class="alert-error">{{ error() }}</p> }
              <button type="submit" class="btn-primary w-full" [disabled]="busy() || f.invalid">
                {{ busy() ? 'Uniéndote…' : 'Aceptar invitación' }}
              </button>
            </form>
          } @else {
            <h1 class="page-title">Invitación no válida</h1>
            <p role="alert" class="alert-error mt-6">El enlace venció, ya se usó o fue cancelado. Pide una nueva invitación a quien te invitó.</p>
            <a routerLink="/login" class="btn-secondary mt-6 w-full">Ir al inicio de sesión</a>
          }
        </section>
      </div>
    </main>`,
})
export class InviteAcceptComponent {
  private readonly http = inject(HttpClient);
  private readonly token = tokenFromFragment(inject(ActivatedRoute).snapshot.fragment);
  readonly info = signal<InvitationInfo | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly accepted = signal(false);
  readonly error = signal('');
  password = '';

  constructor() {
    if (!this.token) { this.loading.set(false); return; }
    this.http.post<InvitationInfo>('/api/v1/invitations/lookup', { token: this.token })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: info => this.info.set(info), error: () => this.info.set(null) });
  }

  roleLabel(role: string): string { return ROLE_LABELS[role] ?? role; }

  accept(): void {
    this.busy.set(true);
    this.error.set('');
    this.http.post('/api/v1/invitations/accept', { token: this.token, password: this.password })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.accepted.set(true),
        error: err => {
          const code = err?.error?.error;
          this.error.set(
            code === 'invalid_credentials' ? 'Contraseña incorrecta para esta cuenta.'
              : code === 'invalid_password' ? 'La contraseña debe tener al menos 12 caracteres.'
              : code === 'already_member' ? 'Ya eres miembro de esta empresa.'
              : code === 'billing_entitlement_denied' ? 'La empresa alcanzó el límite de usuarios de su plan.'
              : code === 'invalid_invitation' ? 'La invitación venció o fue cancelada.'
              : 'No fue posible aceptar la invitación.');
        },
      });
  }
}
