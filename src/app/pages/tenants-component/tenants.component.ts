import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService, TenantSummary } from '../../services/auth.service';

const ROLE_LABELS: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', member: 'Miembro' };

@Component({ standalone: true, templateUrl: './tenants.component.html' })
export class TenantsComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly busy = signal<number | null>(null);

  readonly tenants = computed<TenantSummary[]>(() => {
    const me = this.auth.me();
    if (!me) return [];
    return me.tenant_details ?? me.tenants.map(id => ({ id, name: null, slug: null, role: null }));
  });

  constructor() {
    // Con una sola empresa no hace falta elegir.
    const list = this.tenants();
    if (list.length === 1) this.select(list[0].id);
  }

  initial(name: string | null): string {
    return (name ?? 'E').trim().charAt(0).toUpperCase() || 'E';
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
  }

  select(id: number): void {
    if (this.busy() !== null) return;
    this.busy.set(id);
    this.error.set('');
    // chooseTenant ya carga la empresa y sus permisos.
    this.auth.chooseTenant(id).pipe(finalize(() => this.busy.set(null))).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => this.error.set(
        err.status === 403 ? 'Ya no tienes acceso a esta empresa.' : 'No fue posible abrir la empresa. Intenta de nuevo.'),
    });
  }
}
