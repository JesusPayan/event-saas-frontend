
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

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
