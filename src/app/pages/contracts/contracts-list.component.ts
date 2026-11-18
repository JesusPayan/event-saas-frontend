
import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError, finalize } from 'rxjs';

import { ClientsService } from '../../services/clients.service';
import { EventsService } from '../../services/events.service';

type ContractStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'cancelled';

interface ContractRecord {
  id: number;
  contract_number: string | null;
  client_id: number | null;
  event_id: number | null;
  status: ContractStatus | string;
  currency: string;
  total: number | string;
  created_at: string | null;
}

interface ContractView extends ContractRecord {
  client_name: string;
  event_name: string;
}

@Component({
  selector: 'app-contracts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contracts-list.component.html'
})
export class ContractsListComponent implements OnInit {

  private readonly http = inject(HttpClient);
  private readonly clientsService = inject(ClientsService);
  private readonly eventsService = inject(EventsService);

  private readonly endpoint = '/api/v1/contracts';

  readonly contracts = signal<ContractView[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly downloadingId = signal<number | null>(null);

  readonly search = signal('');
  readonly status = signal('all');

  readonly page = signal(1);
  readonly perPage = 10;

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const selectedStatus = this.status();

    return this.contracts().filter(contract => {
      const matchesStatus =
        selectedStatus === 'all' ||
        contract.status === selectedStatus;

      const searchable = [
        contract.id,
        contract.contract_number,
        contract.client_id,
        contract.event_id,
        contract.client_name,
        contract.event_name
      ]
        .filter(value => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase();

      return matchesStatus &&
        (!query || searchable.includes(query));
    });
  });

  readonly total = computed(() => this.filtered().length);

  readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.perPage))
  );

  readonly paginated = computed(() => {
    const start = (this.page() - 1) * this.perPage;
    return this.filtered().slice(start, start + this.perPage);
  });

  readonly startRecord = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.perPage + 1
  );

  readonly endRecord = computed(() =>
    Math.min(this.page() * this.perPage, this.total())
  );

  readonly activeCount = computed(() =>
    this.filtered().filter(c => c.status === 'active').length
  );

  readonly totalAmount = computed(() =>
    this.filtered().reduce(
      (sum, contract) => sum + Number(contract.total || 0),
      0
    )
  );

  readonly currencies = computed(() =>
    [...new Set(this.filtered().map(c => c.currency || 'MXN'))]
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.http.get<unknown>(this.endpoint)
      .subscribe({
        next: response => {
          let records: unknown = response;

          if (
            response &&
            typeof response === 'object' &&
            !Array.isArray(response)
          ) {
            const body = response as Record<string, unknown>;
            records = body['items'] ??
              body['contracts'] ??
              body['data'];
          }

          if (!Array.isArray(records)) {
            this.contracts.set([]);
            this.error.set(
              'El API devolvió un formato de contratos no reconocido.'
            );
            this.loading.set(false);
            return;
          }

          this.resolveNames(records as ContractRecord[]);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.errorMessage(err));
          this.loading.set(false);
        }
      });
  }

  private resolveNames(records: ContractRecord[]): void {
    if (records.length === 0) {
      this.contracts.set([]);
      this.page.set(1);
      this.loading.set(false);
      return;
    }

    const clientIds = [
      ...new Set(
        records
          .map(c => c.client_id)
          .filter((id): id is number => id !== null)
      )
    ];

    const eventIds = [
      ...new Set(
        records
          .map(c => c.event_id)
          .filter((id): id is number => id !== null)
      )
    ];

    const clients$ = clientIds.map(id =>
      this.clientsService.getById(id).pipe(
        catchError(() => of(null))
      )
    );

    const events$ = eventIds.map(id =>
      this.eventsService.getById(id).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin({
      clients: clients$.length ? forkJoin(clients$) : of([]),
      events: events$.length ? forkJoin(events$) : of([])
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ clients, events }) => {
          const clientMap = new Map<number, string>();
          const eventMap = new Map<number, string>();

          clients.forEach(client => {
            if (client) {
              clientMap.set(
                client.id,
                [client.first_name, client.last_name]
                  .filter(Boolean)
                  .join(' ')
                  .trim() || `Cliente #${client.id}`
              );
            }
          });

          events.forEach(event => {
            if (event) {
              eventMap.set(event.id, event.name);
            }
          });

          this.contracts.set(
            records.map(contract => ({
              ...contract,
              client_name:
                contract.client_id === null
                  ? 'Sin cliente'
                  : clientMap.get(contract.client_id) ??
                    `Cliente #${contract.client_id}`,
              event_name:
                contract.event_id === null
                  ? 'Sin evento'
                  : eventMap.get(contract.event_id) ??
                    `Evento #${contract.event_id}`
            }))
          );

          this.page.set(1);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.errorMessage(err));
        }
      });
  }

  applyFilters(): void {
    this.page.set(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.status.set('all');
    this.page.set(1);
  }

  nextPage(): void {
    if (this.page() < this.pages()) {
      this.page.update(value => value + 1);
    }
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update(value => value - 1);
    }
  }

  label(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      active: 'Activo',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };

    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      draft: 'bg-amber-50 text-amber-700 ring-amber-200',
      active: 'bg-blue-50 text-blue-700 ring-blue-200',
      completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      cancelled: 'bg-red-50 text-red-700 ring-red-200'
    };

    return classes[status] ??
      'bg-slate-50 text-slate-700 ring-slate-200';
  }

  money(value: number | string, currency = 'MXN'): string {
    try {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency || 'MXN'
      }).format(Number(value || 0));
    } catch {
      return `${Number(value || 0).toFixed(2)} ${currency}`;
    }
  }

  downloadPdf(contract: ContractRecord): void {
    if (this.downloadingId() !== null) return;

    this.downloadingId.set(contract.id);
    this.error.set('');

    this.http.get(
      `${this.endpoint}/${contract.id}/pdf`,
      { responseType: 'blob' }
    )
      .pipe(finalize(() => this.downloadingId.set(null)))
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');

          link.href = url;
          link.download =
            `contrato-${contract.contract_number || contract.id}.pdf`;

          document.body.appendChild(link);
          link.click();
          link.remove();

          setTimeout(() => URL.revokeObjectURL(url), 30000);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.errorMessage(err));
        }
      });
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 401) {
      return 'Tu sesión ha expirado.';
    }

    if (err.status === 403) {
      return 'No tienes permisos para consultar contratos.';
    }

    return err.error?.message ||
      'No fue posible completar la operación.';
  }
}
