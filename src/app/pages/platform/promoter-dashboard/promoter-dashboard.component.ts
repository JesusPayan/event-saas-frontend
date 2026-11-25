import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { PlatformService, Prospect, Referral } from '../../../services/platform.service';

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospecto', invited: 'Invitado', registered: 'Dado de alta', discarded: 'Descartado',
};
const STATUS_CLASSES: Record<string, string> = {
  prospect: 'bg-gray-100 text-gray-700', invited: 'bg-blue-100 text-blue-800',
  registered: 'bg-green-100 text-green-800', discarded: 'bg-red-100 text-red-700',
};
const ERRORS: Record<string, string> = {
  invalid_company_name: 'Escribe el nombre de la empresa.',
  invalid_email: 'Correo no válido.',
  prospect_without_email: 'Agrega un correo al prospecto para invitarlo.',
  prospect_not_invitable: 'Ese prospecto ya se dio de alta o está descartado.',
};

/** ROLES-01: prospectos, enlace de referido y avance de las altas del promotor. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, DatePipe],
  templateUrl: './promoter-dashboard.component.html' })
export class PromoterDashboardComponent {
  private readonly platform = inject(PlatformService);
  readonly link = signal('');
  readonly prospects = signal<Prospect[]>([]);
  readonly referrals = signal<Referral[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly formOpen = signal(false);
  readonly statusLabels = STATUS_LABELS;
  readonly statusClasses = STATUS_CLASSES;
  readonly counts = computed(() => {
    const c: Record<string, number> = { prospect: 0, invited: 0, registered: 0 };
    for (const p of this.prospects()) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  });
  form = { company_name: '', contact_name: '', contact_email: '', phone: '', notes: '' };

  constructor() { void this.load(); }

  private fail(err: unknown, fallback: string): void {
    const code = err instanceof HttpErrorResponse ? err.error?.error : '';
    this.error.set(ERRORS[code] ?? fallback);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [summary, prospects, referrals] = await Promise.all([
        firstValueFrom(this.platform.promoterSummary()), firstValueFrom(this.platform.prospects()),
        firstValueFrom(this.platform.referrals())]);
      this.link.set(summary.link);
      this.prospects.set(prospects.items);
      this.referrals.set(referrals.items);
    } catch {
      this.error.set('No se pudo cargar tu información de promotor.');
    } finally {
      this.loading.set(false);
    }
  }

  async copyLink(): Promise<void> {
    try { await navigator.clipboard.writeText(this.link()); this.message.set('Enlace copiado.'); }
    catch { this.message.set('Copia el enlace manualmente.'); }
  }

  openForm(): void {
    this.form = { company_name: '', contact_name: '', contact_email: '', phone: '', notes: '' };
    this.error.set('');
    this.formOpen.set(true);
  }

  async save(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const body = Object.fromEntries(Object.entries(this.form).map(([k, v]) => [k, v.trim() || null]));
      await firstValueFrom(this.platform.createProspect(body));
      this.formOpen.set(false);
      this.message.set('Prospecto registrado.');
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible guardar el prospecto.');
    } finally {
      this.busy.set(false);
    }
  }

  async invite(p: Prospect): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const r = await firstValueFrom(this.platform.inviteProspect(p.id));
      this.message.set(r.email_sent ? `Invitación enviada a ${p.contact_email}.`
        : `No pudimos enviar el correo; comparte tu enlace con ${p.contact_email}.`);
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible enviar la invitación.');
    } finally {
      this.busy.set(false);
    }
  }

  async setStatus(p: Prospect, status: 'prospect' | 'discarded'): Promise<void> {
    try {
      await firstValueFrom(this.platform.updateProspect(p.id, { status }));
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible actualizar el prospecto.');
    }
  }

  subscriptionLabel(s: string): string {
    const labels: Record<string, string> = { free: 'Plan gratuito', active: 'Suscripción activa', trialing: 'En prueba',
      past_due: 'Pago vencido', canceled: 'Cancelada', cancelled: 'Cancelada', pending: 'Pago pendiente' };
    return labels[s] ?? s;
  }
}
