import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
    if (this.auth.hasPermission('clients.read')) {
      tasks.push(firstValueFrom(this.clients.getAll(1)).then(r => this.clientsTotal.set(r.total)).catch(() => undefined));
    }
    if (this.auth.hasPermission('events.read')) {
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
    if (this.auth.hasPermission('tenant.read')) {
      tasks.push(firstValueFrom(this.billing.current()).then(r => this.subscription.set(r)).catch(() => undefined));
    }
    await Promise.all(tasks);
    this.loading.set(false);
  }
}
