import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { CatalogService, ITEM_STATUS_CLASSES, ITEM_STATUS_LABELS, PRICING_LABELS, PricingMode, ProviderItem }
  from '../../../services/catalog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

/** CAT-01: portal del proveedor. Solo muestra y modifica sus propias partidas. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './provider-items.component.html' })
export class ProviderItemsComponent {
  private readonly catalog = inject(CatalogService);
  readonly items = signal<ProviderItem[]>([]);
  readonly loading = signal(true);
  readonly busy = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly statusLabels = ITEM_STATUS_LABELS;
  readonly statusClasses = ITEM_STATUS_CLASSES;
  prices: Record<number, string> = {};

  constructor() { void this.load(); }

  pricing(mode: string | null): string { return mode ? PRICING_LABELS[mode as PricingMode] ?? mode : ''; }

  editable(i: ProviderItem): boolean { return i.quote_status === 'draft' || i.quote_status === 'sent'; }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.items.set((await firstValueFrom(this.catalog.myItems())).items);
    } catch {
      this.error.set('No se pudieron cargar tus partidas.');
    } finally {
      this.loading.set(false);
    }
  }

  async update(i: ProviderItem, body: { unit_price?: string; fulfillment_status?: string }): Promise<void> {
    this.busy.set(i.id);
    this.error.set('');
    this.message.set('');
    try {
      await firstValueFrom(this.catalog.updateMyItem(i.id, body));
      this.message.set('Partida actualizada.');
      await this.load();
    } catch (err) {
      const details = err instanceof HttpErrorResponse ? err.error?.details : null;
      this.error.set(details?.quote === 'not_editable' ? 'La cotización ya no admite cambios.'
        : 'No fue posible actualizar la partida.');
    } finally {
      this.busy.set(null);
    }
  }

  setPrice(i: ProviderItem): void {
    const value = Number(this.prices[i.id]);
    if (!(value >= 0)) { this.error.set('Escribe un importe válido.'); return; }
    void this.update(i, { unit_price: value.toFixed(2) });
  }
}
