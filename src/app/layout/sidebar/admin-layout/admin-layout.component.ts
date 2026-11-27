
import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

import { SidebarComponent } from '../sidebar/sidebar';
import { AuthService } from '../../../services/auth.service';
import { BRAND } from '../../../core/brand';
import { BillingNoticeService } from '../../../services/billing-notice.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    SidebarComponent
  ],
  templateUrl: './admin-layout.component.html'
})
export class AdminLayoutComponent {

  readonly auth = inject(AuthService);
  readonly brand = BRAND;
  readonly billingNotice = inject(BillingNoticeService);
  private readonly router = inject(Router);
  private readonly url = toSignal(this.router.events.pipe(
    filter(e => e instanceof NavigationEnd), map(e => (e as NavigationEnd).urlAfterRedirects)),
    { initialValue: this.router.url });

  /** MOD-01: módulo de la ruta actual si está inactivo o fuera del plan (solo consulta). */
  readonly readOnlyModule = computed(() => {
    const url = this.url().split('?')[0];
    const modules = this.auth.capabilities()?.modules ?? [];
    let best: { name: string; status: string; length: number } | null = null;
    for (const m of modules) {
      for (const route of m.routes) {
        if ((url === route || url.startsWith(route + '/')) && (!best || route.length > best.length)) {
          best = { name: m.name, status: m.status, length: route.length };
        }
      }
    }
    return best && best.status !== 'active' ? best : null;
  });

  readonly companyName = computed(() => {
    const tenant = this.auth.tenant();

    // Panel de plataforma o de promotor: alcance global, sin empresa elegida.
    if (!tenant) {
      return 'Plataforma';
    }

    return tenant?.name ||
      tenant?.slug ||
      `Empresa #${this.auth.tenantId() ?? '—'}`;
  });

  readonly userEmail = computed(() =>
    this.auth.me()?.email ?? ''
  );

  readonly userInitials = computed(() => {
    const email = this.userEmail();

    if (!email) {
      return 'US';
    }

    const name = email.split('@')[0];

    return name
      .split(/[._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'US';
  });

  logout(): void {
    this.auth.logout();
  }
}
