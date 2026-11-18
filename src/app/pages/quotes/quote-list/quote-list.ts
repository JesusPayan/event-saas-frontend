
import {
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil, finalize } from 'rxjs';

import { QuotesService } from '../../../services/quotes.service';
import { AuthService } from '../../../services/auth.service';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card';
import { DataTableComponent } from '../../../shared/components/data-table/data-table';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

interface Quote {
  id: number;
  status?: string;
  total?: number | string;
  created_at?: string;
  client_id?: number;
  event_id?: number;
}

interface QuotesResponse {
  items?: Quote[];
  quotes?: Quote[];
  total?: number;
  page?: number;
  per_page?: number;
}

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    StatCardComponent,
    DataTableComponent,
    PaginationComponent
  ],
  templateUrl: './quote-list.html'
})
export class QuoteList implements OnInit, OnDestroy {

  readonly auth = inject(AuthService);
  private readonly quotesService = inject(QuotesService);

  private readonly destroy$ = new Subject<void>();
  private requestId = 0;

  readonly quotes = signal<Quote[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly perPage = 20;

  readonly search = signal('');
  readonly statusFilter = signal('all');

  readonly statusOptions = computed(() =>
    [...new Set(
      this.quotes()
        .map(quote => quote.status)
        .filter((status): status is string => !!status)
    )].sort()
  );

  readonly filteredQuotes = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    return this.quotes().filter(quote => {
      const searchable = [
        quote.id,
        quote.client_id ?? '',
        quote.event_id ?? ''
      ].join(' ').toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (status === 'all' || quote.status === status)
      );
    });
  });

  readonly draftCount = computed(() =>
    this.quotes().filter(q => q.status === 'draft').length
  );

  readonly sentCount = computed(() =>
    this.quotes().filter(q => q.status === 'sent').length
  );

  readonly approvedCount = computed(() =>
    this.quotes().filter(q => q.status === 'approved').length
  );

  readonly hasActiveFilters = computed(() =>
    this.search().trim() !== '' ||
    this.statusFilter() !== 'all'
  );

  ngOnInit(): void {
    this.loadQuotes();
  }

  loadQuotes(page = this.page()): void {
    if (page < 1 || this.loading()) return;

    const currentRequest = ++this.requestId;

    this.loading.set(true);
    this.error.set('');

    this.quotesService.getQuotes(page, this.perPage)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (currentRequest === this.requestId) {
            this.loading.set(false);
          }
        })
      )
      .subscribe({
        next: (response: unknown) => {
          if (currentRequest !== this.requestId) return;

          const data = (
            Array.isArray(response) ? {} : response
          ) as QuotesResponse;

          const items = Array.isArray(response)
            ? response as Quote[]
            : data.items ?? data.quotes ?? [];

          this.quotes.set(items);
          this.total.set(data.total ?? items.length);
          this.page.set(data.page ?? page);
        },
        error: (err: HttpErrorResponse) => {
          if (currentRequest !== this.requestId) return;

          if (err.status === 401) {
            this.error.set('Sesión inválida o expirada.');
          } else if (err.status === 403) {
            this.error.set(
              'No tienes permisos para consultar cotizaciones.'
            );
          } else {
            this.error.set(
              `Error al consultar cotizaciones (${err.status}).`
            );
          }

          console.error('Error al consultar cotizaciones:', err);
        }
      });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
  }

  
statusLabel(status?: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    sent: 'Enviada',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    expired: 'Vencida',
    cancelled: 'Cancelada',
    converted: 'Convertida'
  };

  return labels[status ?? ''] ?? status ?? 'Sin estado';
}

statusClass(status?: string): string {
  const classes: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    converted: 'bg-purple-100 text-purple-700'
  };

  return classes[status ?? ''] ??
    'bg-slate-100 text-slate-700';
}


  onPageChange(page: number): void {
    if (page === this.page()) return;
    this.loadQuotes(page);
  }

  ngOnDestroy(): void {
    this.requestId++;
    this.destroy$.next();
    this.destroy$.complete();
  }
}
