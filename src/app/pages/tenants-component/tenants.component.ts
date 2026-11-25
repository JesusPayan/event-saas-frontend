import { BRAND } from '../../core/brand';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { AuthService, TenantSummary } from '../../services/auth.service';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario', admin: 'Administrador', member: 'Miembro', staff: 'Operativo', viewer: 'Solo lectura',
  provider: 'Proveedor', delegated: 'Acceso temporal',
};

@Component({ standalone: true, imports: [BrandLogoComponent, RouterLink, DatePipe], templateUrl: './tenants.component.html' })
export class TenantsComponent {
  readonly brand = BRAND;
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly busy = signal<number | null>(null);

  readonly tenants = computed<TenantSummary[]>(() => {
    const me = this.auth.me();
    if (!me) return [];
    return me.tenant_details ?? me.tenants.map(id => ({ id, name: null, slug: null, role: null }));
  });

  /** Primera pantalla del panel de plataforma según los permisos. */
  readonly platformHome = computed(() => {
    const auth = this.auth;
    if (auth.hasPlatformPermission('platform.orgs.manage')) return '/platform/organizations';
    if (auth.hasPlatformPermission('platform.billing.operate')) return '/platform/subscriptions';
    if (auth.hasPlatformPermission('platform.plans.manage')) return '/platform/prices';
    return null;
  });

  constructor() {
    // Con una sola empresa (y sin funciones de plataforma) no hace falta elegir.
    const list = this.tenants();
    if (list.length === 1 && this.auth.platformRoles().length === 0) this.select(list[0].id);
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
      // Un proveedor externo entra directo a sus partidas.
      next: () => void this.router.navigate([
        this.auth.hasPermission('provider.items') && !this.auth.hasPermission('events.read')
          ? '/provider/items' : '/dashboard']),
      error: (err: HttpErrorResponse) => this.error.set(
        err.error?.error === 'tenant_suspended' ? 'La empresa está suspendida. Contacta a soporte.'
          : err.status === 403 ? 'Ya no tienes acceso a esta empresa.' : 'No fue posible abrir la empresa. Intenta de nuevo.'),
    });
  }
}
