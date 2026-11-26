import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { CatalogService, ITEM_STATUS_CLASSES, ITEM_STATUS_LABELS, NetworkRequest, PRICING_LABELS, PricingMode }
  from '../../../services/catalog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

/** NET-01: servicios que otras organizaciones solicitaron a la mía desde el catálogo de la red. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './network-requests.component.html' })
export class NetworkRequestsComponent {
  private readonly catalog = inject(CatalogService);
  readonly auth = inject(AuthService);
  readonly items = signal<NetworkRequest[]>([]);
  readonly loading = signal(true);
  readonly busy = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly statusLabels = ITEM_STATUS_LABELS;
  readonly statusClasses = ITEM_STATUS_CLASSES;
  readonly canRespond = computed(() => this.auth.hasPermission('catalog.manage'));
  costs: Record<number, string> = {};

  constructor() { void this.load(); }

  pricing(mode: string | null): string { return mode ? PRICING_LABELS[mode as PricingMode] ?? mode : ''; }

  editable(i: NetworkRequest): boolean {
    return this.canRespond() && (i.quote_status === 'draft' || i.quote_status === 'sent');
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.items.set((await firstValueFrom(this.catalog.networkRequests())).items);
    } catch {
      this.error.set('No se pudieron cargar las solicitudes.');
    } finally {
      this.loading.set(false);
    }
  }

  async respond(i: NetworkRequest, body: { cost_unit_price?: string; fulfillment_status?: string }): Promise<void> {
    this.busy.set(i.id);
    this.error.set('');
    this.message.set('');
    try {
      await firstValueFrom(this.catalog.respondNetworkRequest(i.id, body));
      this.message.set(`Respuesta enviada a ${i.requester_name}.`);
      await this.load();
    } catch (err) {
      const details = err instanceof HttpErrorResponse ? err.error?.details : null;
      this.error.set(details?.quote === 'not_editable' ? 'La cotización ya se cerró y no admite cambios.'
        : 'No fue posible responder la solicitud.');
    } finally {
      this.busy.set(null);
    }
  }

  setCost(i: NetworkRequest): void {
    const value = Number(this.costs[i.id]);
    if (!(value >= 0)) { this.error.set('Escribe un importe válido.'); return; }
    void this.respond(i, { cost_unit_price: value.toFixed(2) });
  }
}
