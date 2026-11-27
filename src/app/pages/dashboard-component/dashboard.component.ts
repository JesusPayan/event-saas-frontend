import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { ClientsService } from '../../services/clients.service';
import { EventsService } from '../../services/events.service';
import { Event } from '../../models/event.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import {
  BillingService, SUBSCRIPTION_STATUS_LABELS, SubscriptionResponse,
} from '../billing/billing.service';

const EVENT_STATUS: Record<string, { label: string; css: string }> = {
  draft: { label: 'Borrador', css: 'bg-gray-100 text-gray-700' },
  quoted: { label: 'Cotizado', css: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmado', css: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'En progreso', css: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completado', css: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', css: 'bg-red-100 text-red-800' },
};

/**
 * MOD-01: registro de widgets. Cada widget declara el módulo y el permiso que necesita;
 * solo se muestran (y se consultan) los de módulos activos para la empresa.
 */
export interface DashboardWidget { id: string; module: string; permission: string; }
export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'clients', module: 'CORE_CLIENTS', permission: 'clients.read' },
  { id: 'events', module: 'CORE_EVENTS', permission: 'events.read' },
  { id: 'upcoming', module: 'CORE_CALENDAR', permission: 'events.read' },
  { id: 'subscription', module: 'SUBSCRIPTION_MANAGEMENT', permission: 'tenant.read' },
  { id: 'quotes_sent', module: 'COMMERCIAL_QUOTES', permission: 'quotes.read' },
  { id: 'network_requests', module: 'ORGANIZATION_NETWORK', permission: 'catalog.read' },
  { id: 'inventory', module: 'INVENTORY', permission: 'inventory.read' },
  { id: 'logistics', module: 'LOGISTICS', permission: 'inventory.read' },
  { id: 'contracts', module: 'COMMERCIAL_CONTRACTS', permission: 'contracts.read' },
  { id: 'catalog', module: 'COMMERCIAL_CATALOG', permission: 'catalog.read' },
];

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
  private readonly clients = inject(ClientsService);
  private readonly events = inject(EventsService);
  private readonly billing = inject(BillingService);

  readonly loading = signal(true);
  readonly clientsTotal = signal<number | null>(null);
  readonly eventsTotal = signal<number | null>(null);
  readonly upcoming = signal<Event[]>([]);
  readonly subscription = signal<SubscriptionResponse | null>(null);
  readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  private readonly http = inject(HttpClient);
  readonly quotesSent = signal<number | null>(null);
  readonly networkPending = signal<number | null>(null);
  /** Empresa anterior a v1.3.0 o con onboarding pendiente: invitación no intrusiva. */
  readonly suggestSetup = computed(() => {
    const o = this.auth.capabilities()?.onboarding;
    return this.auth.hasPermission('members.manage') && (o === 'legacy' || o === 'in_progress');
  });

  show(id: string): boolean {
    const w = DASHBOARD_WIDGETS.find(x => x.id === id);
    return !!w && this.auth.hasModule(w.module) && this.auth.hasPermission(w.permission);
  }

  constructor() {
    void this.load();
  }

  eventStatus(status: string) {
    return EVENT_STATUS[status] ?? { label: status, css: 'bg-gray-100 text-gray-700' };
  }

  /** Cada bloque se carga solo si el usuario tiene permiso; un fallo no bloquea a los demás. */
  async load(): Promise<void> {
    this.loading.set(true);
    const tasks: Promise<unknown>[] = [];
    if (this.show('clients')) {
      tasks.push(firstValueFrom(this.clients.getAll(1)).then(r => this.clientsTotal.set(r.total)).catch(() => undefined));
    }
    if (this.show('events')) {
      tasks.push(firstValueFrom(this.events.list({ page: 1, per_page: 1 })).then(r => this.eventsTotal.set(r.total)).catch(() => undefined));
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
      // ISO completo con zona horaria (Z): el backend rechaza fechas sin zona (400).
      const iso = (d: Date) => d.toISOString();
      tasks.push(firstValueFrom(this.events.calendar(iso(now), iso(in30)))
        .then(items => this.upcoming.set(items
          .filter(e => e.status !== 'cancelled' && new Date(e.starts_at) >= now)
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))))
        .catch(() => undefined));
    }
    if (this.show('subscription')) {
      tasks.push(firstValueFrom(this.billing.current()).then(r => this.subscription.set(r)).catch(() => undefined));
    }
    if (this.show('quotes_sent')) {
      // Cotizaciones enviadas que esperan respuesta (entre las 100 más recientes).
      tasks.push(firstValueFrom(this.http.get<{ items: { status: string }[] }>('/api/v1/quotes?page=1&per_page=100'))
        .then(r => this.quotesSent.set(r.items.filter(q => q.status === 'sent').length)).catch(() => undefined));
    }
    if (this.show('network_requests')) {
      tasks.push(firstValueFrom(this.http.get<{ items: { fulfillment_status: string; quote_status: string }[] }>('/api/v1/network/requests'))
        .then(r => this.networkPending.set(r.items.filter(i => i.fulfillment_status === 'pending_confirmation'
          && (i.quote_status === 'draft' || i.quote_status === 'sent')).length)).catch(() => undefined));
    }
    await Promise.all(tasks);
    this.loading.set(false);
  }
}
