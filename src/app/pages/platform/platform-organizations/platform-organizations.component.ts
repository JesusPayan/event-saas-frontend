import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { Organization, PlatformService } from '../../../services/platform.service';

const ERRORS: Record<string, string> = {
  invalid_name: 'Escribe un nombre de 3 a 180 caracteres.',
  invalid_slug: 'El identificador solo admite minúsculas, números y guiones.',
  slug_taken: 'Ese identificador ya está en uso.',
  invalid_email: 'Correo no válido.',
  status_unchanged: 'La organización ya estaba en ese estado.',
};

/** ROLES-01: alta de organizaciones y gestión de su estado (sin datos privados). */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, DatePipe],
  templateUrl: './platform-organizations.component.html' })
export class PlatformOrganizationsComponent {
  private readonly platform = inject(PlatformService);
  readonly items = signal<Organization[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly createOpen = signal(false);
  readonly created = signal<{ name: string; invite_url: string; email_sent: boolean } | null>(null);
  readonly statusTarget = signal<Organization | null>(null);
  search = '';
  status = '';
  form = { name: '', slug: '', owner_email: '' };
  reason = '';

  constructor() { void this.load(); }

  private fail(err: unknown, fallback: string): void {
    const code = err instanceof HttpErrorResponse ? err.error?.error : '';
    this.error.set(ERRORS[code] ?? fallback);
  }

  async load(page = 1): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.platform.organizations(page, this.search.trim(), this.status));
      this.items.set(r.items);
      this.total.set(r.total);
      this.page.set(r.page);
    } catch {
      this.error.set('No se pudieron cargar las organizaciones.');
    } finally {
      this.loading.set(false);
    }
  }

  slugify(): void {
    if (this.form.slug) return;
    this.form.slug = this.form.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  openCreate(): void {
    this.form = { name: '', slug: '', owner_email: '' };
    this.created.set(null);
    this.error.set('');
    this.createOpen.set(true);
  }

  async create(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await firstValueFrom(this.platform.createOrganization({
        name: this.form.name.trim(), slug: this.form.slug.trim(), owner_email: this.form.owner_email.trim() }));
      this.created.set({ name: r.organization.name, invite_url: r.invite_url, email_sent: r.email_sent });
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible dar de alta la organización.');
    } finally {
      this.busy.set(false);
    }
  }

  askStatus(org: Organization): void {
    this.reason = '';
    this.error.set('');
    this.statusTarget.set(org);
  }

  async applyStatus(): Promise<void> {
    const org = this.statusTarget();
    if (!org) return;
    const next = org.status === 'active' ? 'suspended' : 'active';
    this.busy.set(true);
    try {
      await firstValueFrom(this.platform.setOrganizationStatus(org.id, next, this.reason.trim()));
      this.message.set(next === 'suspended' ? `${org.name} quedó suspendida.` : `${org.name} quedó activa.`);
      this.statusTarget.set(null);
      await this.load(this.page());
    } catch (err) {
      this.fail(err, 'No fue posible cambiar el estado.');
    } finally {
      this.busy.set(false);
    }
  }

  async copy(text: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); this.message.set('Enlace copiado.'); }
    catch { this.message.set('Copia el enlace manualmente.'); }
  }

  subscriptionLabel(status: string | null): string {
    const labels: Record<string, string> = { active: 'Activa', trialing: 'Prueba', past_due: 'Pago vencido',
      canceled: 'Cancelada', cancelled: 'Cancelada', pending: 'Pendiente' };
    return status ? (labels[status] ?? status) : 'Plan gratuito';
  }
}
