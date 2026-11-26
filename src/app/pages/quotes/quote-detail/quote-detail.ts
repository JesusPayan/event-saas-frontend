import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import { QuotesService } from '../../../services/quotes.service';
import { Quote, QuoteItem, QuoteStatus } from '../../../services/quotes';
import { AuthService } from '../../../services/auth.service';
import { ITEM_STATUS_CLASSES, ITEM_STATUS_LABELS, PRICING_LABELS, PricingMode } from '../../../services/catalog.service';
import { ClientsService } from '../../../services/clients.service';
import { EventsService } from '../../../services/events.service';
import {
  ContractsService,
  GeneratedContract
} from '../../../services/contracts.service';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './quote-detail.html',
  styleUrl: './quote-detail.css'
})
export class QuoteDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly quotesService = inject(QuotesService);
  private readonly clientsService = inject(ClientsService);
  private readonly eventsService = inject(EventsService);
  private readonly contractsService = inject(ContractsService);

readonly reviewingContract = signal(false);
readonly generatingContract = signal(false);
readonly generatedContract = signal<GeneratedContract | null>(null);

readonly canGenerateContract = computed(() => {
  const q = this.quote();

  return q?.status === 'accepted' &&
    (q.items?.length ?? 0) > 0 &&
    Number(q.total) > 0 &&
    !this.generatedContract();
});

  readonly quote = signal<Quote | null>(null);
  readonly clientName = signal('');
  readonly eventName = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly downloadingPdf = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly operationNotes = signal('');

  readonly totalItems = computed(() => this.quote()?.items?.length ?? 0);

  // CAT-01: seguimiento de partidas (precio acordado, confirmación y documentos)
  readonly auth = inject(AuthService);
  readonly itemStatusLabels = ITEM_STATUS_LABELS;
  readonly itemStatusClasses = ITEM_STATUS_CLASSES;
  readonly itemBusy = signal<number | null>(null);
  agreedPrices: Record<number, string> = {};
  readonly canTrackItems = computed(() => {
    const q = this.quote();
    return !!q && this.auth.hasPermission('quotes.create') && (q.status === 'draft' || q.status === 'sent');
  });
  readonly hasCatalogItems = computed(() =>
    (this.quote()?.items ?? []).some(i => !!i.offer_id || i.price_status === 'pending'));

  pricingLabel(mode: string | null | undefined): string {
    return mode ? (PRICING_LABELS[mode as PricingMode] ?? mode) : '';
  }

  updateItem(item: QuoteItem, body: { unit_price?: string; fulfillment_status?: string; compliance_status?: string }): void {
    const quote = this.quote();
    if (!quote) return;
    this.itemBusy.set(item.id);
    this.error.set('');
    this.success.set('');
    this.quotesService.updateItem(quote.id, item.id, body)
      .pipe(finalize(() => this.itemBusy.set(null)))
      .subscribe({
        next: updated => {
          this.quote.set(updated);
          this.success.set('Partida actualizada.');
        },
        error: (err: HttpErrorResponse) => this.error.set(this.getErrorMessage(err)),
      });
  }

  saveAgreedPrice(item: QuoteItem): void {
    const value = Number(this.agreedPrices[item.id]);
    if (!(value >= 0)) {
      this.error.set('Escribe un importe válido.');
      return;
    }
    this.updateItem(item, { unit_price: value.toFixed(2) });
  }

  readonly availableActions = computed<QuoteStatus[]>(() => {
    const status = this.quote()?.status;
    if (status === 'draft') return ['sent', 'cancelled'];
    if (status === 'sent') return ['accepted', 'rejected', 'expired', 'cancelled'];
    return [];
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.error.set('El identificador de la cotización no es válido.');
      return;
    }
    this.loadQuote(id);
  }


openContractReview(): void {
  if (!this.canGenerateContract() ||
      this.saving() ||
      this.loading()) {
    return;
  }

  this.error.set('');
  this.success.set('');
  this.reviewingContract.set(true);
}

closeContractReview(): void {
  if (this.generatingContract()) return;

  this.reviewingContract.set(false);
}

confirmGenerateContract(): void {
  const q = this.quote();

  if (!q ||
      !this.reviewingContract() ||
      !this.canGenerateContract() ||
      this.generatingContract()) {
    return;
  }

  this.generatingContract.set(true);
  this.error.set('');
  this.success.set('');

  this.contractsService.createFromQuote(q.id)
    .pipe(
      finalize(() => this.generatingContract.set(false))
    )
    .subscribe({
      next: contract => {
        this.generatedContract.set(contract);
        this.reviewingContract.set(false);

        // El backend convierte la cotización a "converted".
        this.quote.update(current =>
          current
            ? { ...current, status: 'converted' }
            : current
        );

        this.success.set(
          `Contrato ${contract.contract_number} generado correctamente.`
        );
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          const code = err.error?.error;

          if (code === 'contract_already_exists') {
            this.error.set(
              'Esta cotización ya tiene un contrato. ' +
              'Consulta el módulo de contratos.'
            );
          } else if (code === 'quote_not_accepted') {
            this.error.set(
              'La cotización ya no está aceptada. ' +
              'Actualiza la información antes de continuar.'
            );
          } else {
            this.error.set(
              err.error?.message ||
              'No se pudo generar el contrato por un conflicto.'
            );
          }

          // Recuperar el estado real del servidor.
          this.reviewingContract.set(false);
          this.loadQuote(q.id);
          return;
        }

        this.error.set(
          err.error?.message ||
          'No fue posible generar el contrato.'
        );
      }
    });
}


  loadQuote(id: number): void {
    this.loading.set(true);
    this.quote.set(null);
    this.clientName.set('');
    this.eventName.set('');
    this.error.set('');
    this.success.set('');

    this.quotesService.getQuote(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: quote => {
          this.quote.set(quote);
          this.loadRelatedNames(quote);
        },
        error: (err: HttpErrorResponse) => this.error.set(this.getErrorMessage(err))
      });
  }

  private loadRelatedNames(quote: Quote): void {
    this.clientsService.getById(quote.client_id).subscribe({
      next: client => {
        this.clientName.set(
          [client.first_name, client.last_name].filter(Boolean).join(' ').trim()
          || `Cliente #${quote.client_id}`
        );
      },
      error: () => this.clientName.set(`Cliente #${quote.client_id}`)
    });

    this.eventsService.getById(quote.event_id).subscribe({
      next: event => this.eventName.set(event.name || `Evento #${quote.event_id}`),
      error: () => this.eventName.set(`Evento #${quote.event_id}`)
    });
  }

  changeStatus(status: QuoteStatus): void {
    const quote = this.quote();
    if (!quote || this.saving() || !this.availableActions().includes(status)) return;

    if (!window.confirm(`¿Confirmas cambiar la cotización a "${this.statusLabel(status)}"?`)) {
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.quotesService.changeStatus(quote.id, status, this.operationNotes().trim() || null)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: updated => {
          // Recargar el detalle completo: algunas APIs de cambio de estado
          // devuelven una cotización sin el arreglo de conceptos.
          this.operationNotes.set('');
          this.quote.set({ ...quote, ...updated, items: updated.items ?? quote.items });
          this.success.set(`La cotización cambió correctamente a "${this.statusLabel(updated.status)}".`);
        },
        error: (err: HttpErrorResponse) => this.error.set(this.getErrorMessage(err))
      });
  }

  statusLabel(status: QuoteStatus): string {
    const labels: Record<QuoteStatus, string> = {
      draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada',
      rejected: 'Rechazada', expired: 'Vencida',
      cancelled: 'Cancelada', converted: 'Convertida'
    };
    return labels[status] ?? status;
  }

  statusClasses(status: QuoteStatus): string {
    const classes: Record<QuoteStatus, string> = {
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-amber-100 text-amber-800',
      cancelled: 'bg-slate-200 text-slate-700',
      converted: 'bg-purple-100 text-purple-800'
    };
    return classes[status] ?? 'bg-slate-100 text-slate-700';
  }

  itemTypeLabel(type: string): string {
    return ({ inventory: 'Inventario', service: 'Servicio', custom: 'Personalizado' } as Record<string, string>)[type] ?? type;
  }

  money(value: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: this.quote()?.currency || 'MXN'
    }).format(Number(value ?? 0));
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    if (err.status === 403) return 'No tienes permisos para realizar esta operación.';
    if (err.status === 404) return 'No se encontró la cotización en la empresa seleccionada.';
    if (err.status === 409 && err.error?.details?.items === 'pending_items') {
      return 'No se puede aceptar: hay partidas con precio, confirmación del proveedor o documentos pendientes.';
    }
    if (err.status === 409) return 'La transición de estado no está permitida.';
    if (err.status === 400 || err.status === 422) {
      const details = err.error?.details;
      if (details && typeof details === 'object') {
        return `Error de validación: ${JSON.stringify(details)}`;
      }
      return 'La solicitud contiene datos no válidos.';
    }
    return typeof err.error?.message === 'string'
      ? err.error.message
      : 'Ocurrió un error al procesar la cotización.';
  }

  downloadPdf(): void {
    const quote = this.quote();
    if (!quote || this.downloadingPdf()) return;
    this.downloadingPdf.set(true);
    this.error.set('');

    this.quotesService.downloadPdf(quote.id)
      .pipe(finalize(() => this.downloadingPdf.set(false)))
      .subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `cotizacion-${quote.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: (err: HttpErrorResponse) => this.error.set(this.getErrorMessage(err))
      });
  }
}
