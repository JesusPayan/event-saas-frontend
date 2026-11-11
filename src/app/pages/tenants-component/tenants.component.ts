
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  templateUrl: './tenants.component.html'
})
export class TenantsComponent {

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal('');
  readonly busy = signal(false);

  select(id: number): void {
    if (this.busy()) return;

    this.busy.set(true);
    this.error.set('');

    this.auth.chooseTenant(id).pipe(
      switchMap(() => this.auth.loadPermissions()),
      finalize(() => this.busy.set(false))
    ).subscribe({
      next: () => {
        // void this.router.navigateByUrl('/dashboard');
        void this.router.navigate(['/events']);
      },
     error: err => {
  console.error('Status:', err.status);
  console.error('URL:', err.url);
  console.error('Respuesta:', err.error);

  this.error.set(
    err.status === 200
      ? 'El servidor devolvió una respuesta que no es JSON.'
      : `Error HTTP ${err.status}`
  );
}
    });
  }
}