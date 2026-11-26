import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { CatalogService, Provider } from '../../../services/catalog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

const ERRORS: Record<string, string> = {
  invalid_name: 'Escribe el nombre del proveedor.',
  provider_name_taken: 'Ya tienes un proveedor con ese nombre.',
  invalid_contact_email: 'Correo no válido.',
};

/** CAT-01: proveedores externos de la organización. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, RouterLink],
  templateUrl: './providers.component.html' })
export class ProvidersComponent {
  private readonly catalog = inject(CatalogService);
  readonly auth = inject(AuthService);
  readonly items = signal<Provider[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly editing = signal<Provider | 'new' | null>(null);
  readonly canManage = computed(() => this.auth.hasPermission('catalog.manage'));
  form = { name: '', contact_name: '', contact_email: '', phone: '', notes: '' };

  constructor() { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.items.set((await firstValueFrom(this.catalog.providers())).items);
    } catch {
      this.error.set('No se pudieron cargar los proveedores.');
    } finally {
      this.loading.set(false);
    }
  }

  open(p: Provider | null): void {
    this.form = { name: p?.name ?? '', contact_name: p?.contact_name ?? '', contact_email: p?.contact_email ?? '',
      phone: p?.phone ?? '', notes: p?.notes ?? '' };
    this.error.set('');
    this.editing.set(p ?? 'new');
  }

  async save(): Promise<void> {
    const target = this.editing();
    this.busy.set(true);
    this.error.set('');
    const body = Object.fromEntries(Object.entries(this.form).map(([k, v]) => [k, v.trim() || null])) as Partial<Provider>;
    try {
      if (target === 'new') await firstValueFrom(this.catalog.createProvider(body));
      else if (target) await firstValueFrom(this.catalog.updateProvider(target.id, body));
      this.editing.set(null);
      await this.load();
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? err.error?.error : '';
      this.error.set(ERRORS[code] ?? 'No fue posible guardar el proveedor.');
    } finally {
      this.busy.set(false);
    }
  }

  async toggle(p: Provider): Promise<void> {
    try {
      await firstValueFrom(this.catalog.updateProvider(p.id, { status: p.status === 'active' ? 'inactive' : 'active' }));
      await this.load();
    } catch {
      this.error.set('No fue posible cambiar el estado.');
    }
  }
}
