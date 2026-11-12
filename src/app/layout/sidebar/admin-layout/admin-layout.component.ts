
import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../sidebar/sidebar';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent
  ],
  templateUrl: './admin-layout.component.html'
})
export class AdminLayoutComponent {

  readonly auth = inject(AuthService);

  readonly companyName = computed(() => {
    const tenant = this.auth.tenant();

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
