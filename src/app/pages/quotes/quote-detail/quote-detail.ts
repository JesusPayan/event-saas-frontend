
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { QuotesService } from '../../../services/quotes.service';
import { Quote, QuoteStatus } from '../../../services/quotes';



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

  readonly quote = signal<Quote | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly operationNotes = signal('');

  readonly totalItems = computed(() =>
    this.quote()?.items?.length ?? 0
  );

  readonly availableActions = computed<QuoteStatus[]>(() => {
    const status = this.quote()?.status;

    if (status === 'draft') {
      return ['sent', 'cancelled'];
    }

    if (status === 'sent') {
      return [
        'accepted',
        'rejected',
        'expired',
        'cancelled'
      ];
    }

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

  loadQuote(id: number): void {
  this.loading.set(true);
  this.quote.set(null);
  this.error.set('');
  this.success.set('');

  this.quotesService.getQuote(id).subscribe({
    next: (quote: Quote) => {
      this.quote.set(quote);
      this.loading.set(false);
    },
    error: (err: HttpErrorResponse) => {
      this.error.set(this.getErrorMessage(err));
      this.loading.set(false);
    }
  });
}

  changeStatus(status: QuoteStatus): void {
    const quote = this.quote();

    if (
      !quote ||
      this.saving() ||
      !this.availableActions().includes(status)
    ) {
      return;
    }

    const action = this.statusLabel(status);

    if (!window.confirm(
      `¿Confirmas cambiar la cotización a "${action}"?`
    )) {
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.quotesService.changeStatus(
  quote.id,
  status,
  this.operationNotes().trim() || null
).subscribe({
  next: (updated: Quote) => {
    this.quote.set(updated);
    this.operationNotes.set('');
    this.success.set(
      `La cotización cambió correctamente a "${this.statusLabel(updated.status)}".`
    );
    this.saving.set(false);
  },
  error: (err: HttpErrorResponse) => {
    this.error.set(this.getErrorMessage(err));
    this.saving.set(false);
  }
});
  }

  statusLabel(status: QuoteStatus): string {
    const labels: Record<QuoteStatus, string> = {
      draft: 'Borrador',
      sent: 'Enviada',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      expired: 'Vencida',
      cancelled: 'Cancelada',
      converted: 'Convertida'
    };

    return labels[status] ?? status;
  }

  statusClasses(status: QuoteStatus): string {
    const classes: Record<QuoteStatus, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-amber-100 text-amber-800',
      cancelled: 'bg-gray-200 text-gray-700',
      converted: 'bg-purple-100 text-purple-800'
    };

    return classes[status] ?? 'bg-gray-100 text-gray-800';
  }

  money(value: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: this.quote()?.currency || 'MXN'
    }).format(Number(value ?? 0));
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 403) {
      return 'No tienes permisos para realizar esta operación.';
    }

    if (err.status === 404) {
      return 'No se encontró la cotización en la empresa seleccionada.';
    }

    if (err.status === 409) {
      return 'La transición de estado no está permitida.';
    }

    if (err.status === 400) {
      return 'La solicitud contiene datos no válidos.';
    }

    return err.error?.message ||
      err.error?.error ||
      'Ocurrió un error al procesar la cotización.';
  }

  readonly downloadingPdf = signal(false);

downloadPdf(): void {
  const quote = this.quote();

  if (!quote || this.downloadingPdf()) {
    return;
  }

  this.downloadingPdf.set(true);
  this.error.set('');

  this.quotesService.downloadPdf(quote.id).subscribe({
    next: (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `cotizacion-${quote.id}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.downloadingPdf.set(false);
    },
    error: (err: HttpErrorResponse) => {
      this.error.set(this.getErrorMessage(err));
      this.downloadingPdf.set(false);
    }
  });
}
}
