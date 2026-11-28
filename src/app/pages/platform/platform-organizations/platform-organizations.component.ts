import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { AuthService } from '../../../services/auth.service';
import {
  Organization, OrganizationDetail, OrganizationStatus, PlatformService,
} from '../../../services/platform.service';

type StatusAction = 'suspend' | 'activate' | 'archive' | 'restore';
const ACTION_TARGET: Record<StatusAction, OrganizationStatus> = {
  suspend: 'suspended', activate: 'active', archive: 'archived', restore: 'active',
};
const ACTION_TEXT: Record<StatusAction, { title: string; body: string; ok: string; done: string }> = {
  suspend: { title: 'Desactivar', ok: 'Desactivar', done: 'quedó desactivada',
    body: 'Sus usuarios dejan de operar esta empresa de inmediato, incluso con sesiones abiertas. Sus demás empresas siguen disponibles. Los datos se conservan.' },
  activate: { title: 'Reactivar', ok: 'Reactivar', done: 'quedó activa',
    body: 'Sus usuarios recuperan el acceso con sus roles actuales.' },
  archive: { title: 'Eliminar (archivar)', ok: 'Archivar empresa', done: 'quedó archivada',
    body: 'Baja lógica: deja de aparecer en los listados activos y nadie puede operarla. Los datos y su historial se conservan en «Archivadas».' },
  restore: { title: 'Restaurar desde el archivo', ok: 'Restaurar', done: 'quedó activa de nuevo',
    body: 'La empresa vuelve a estar activa con sus datos y miembros.' },
};

const ERRORS: Record<string, string> = {
  invalid_name: 'Escribe un nombre de 3 a 180 caracteres.',
  invalid_slug: 'El identificador solo admite minúsculas, números y guiones.',
  slug_taken: 'Ese identificador ya está en uso.',
  invalid_email: 'Correo no válido.',
  status_unchanged: 'La organización ya estaba en ese estado.',
  reason_required: 'Escribe el motivo (mínimo 3 caracteres); queda en la auditoría.',
  subscription_renewal_active: 'Tiene una suscripción con renovación automática. Primero debe cancelarse desde Mi suscripción; esta acción no cancela cobros ni emite reembolsos.',
  invalid_transition: 'Ese cambio de estado no está permitido desde el estado actual.',
  forbidden: 'Tu rol no permite esta acción.',
  organization_not_found: 'La organización ya no existe.',
};

/** ROLES-01: alta de organizaciones y gestión de su estado (sin datos privados). */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, DatePipe, RouterLink],
  templateUrl: './platform-organizations.component.html' })
export class PlatformOrganizationsComponent {
  private readonly platform = inject(PlatformService);
  readonly auth = inject(AuthService);
  readonly detail = signal<OrganizationDetail | null>(null);
  readonly action = signal<StatusAction | null>(null);
  readonly actionText = ACTION_TEXT;
  confirmSlug = '';
  readonly items = signal<Organization[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly createOpen = signal(false);
  readonly created = signal<{ name: string; invite_url: string; email_sent: boolean } | null>(null);
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

  async openDetail(org: Organization): Promise<void> {
    this.error.set('');
    this.action.set(null);
    try {
      this.detail.set((await firstValueFrom(this.platform.organization(org.id))).organization);
    } catch (err) {
      this.fail(err, 'No se pudo cargar el detalle.');
    }
  }

  can(action: StatusAction): boolean {
    const d = this.detail();
    if (!d || !d.actions[action].allowed) return false;
    if (action === 'archive') return this.auth.hasPlatformPermission('platform.orgs.archive');
    if (action === 'restore') return this.auth.hasPlatformPermission('platform.orgs.restore');
    return true;
  }

  startAction(action: StatusAction): void {
    this.reason = '';
    this.confirmSlug = '';
    this.error.set('');
    this.action.set(action);
  }

  needsReason(action: StatusAction): boolean { return action !== 'activate'; }

  ready(action: StatusAction): boolean {
    if (this.needsReason(action) && this.reason.trim().length < 3) return false;
    return action !== 'archive' || this.confirmSlug.trim() === this.detail()?.slug;
  }

  async applyAction(): Promise<void> {
    const d = this.detail();
    const action = this.action();
    if (!d || !action) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await firstValueFrom(this.platform.setOrganizationStatus(d.id, ACTION_TARGET[action], this.reason.trim()));
      this.message.set(r.changed ? `${d.name} ${ACTION_TEXT[action].done}.` : `${d.name} ya estaba en ese estado.`);
      this.action.set(null);
      this.detail.set((await firstValueFrom(this.platform.organization(d.id))).organization);
      await this.load(this.page());
    } catch (err) {
      this.fail(err, 'No fue posible cambiar el estado.');
    } finally {
      this.busy.set(false);
    }
  }

  statusLabel(status: string): string {
    return ({ active: 'Activa', suspended: 'Desactivada', archived: 'Archivada' } as Record<string, string>)[status] ?? status;
  }

  statusClass(status: string): string {
    return status === 'active' ? 'bg-green-100 text-green-800'
      : status === 'archived' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-800';
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
