
import {
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize,
  takeUntil
} from 'rxjs';

import { ClientsService } from '../../../services/clients.service';
import { Client } from '../../../models/client.model';
import { AuthService } from '../../../services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { DataTableComponent } from '../../../shared/components/data-table/data-table';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
  // '../../../shared/components/page-header/page-header.component';
  type ClientStatusFilter = 'all' | 'active' | 'inactive';

  @Component({
    standalone: true,
    imports: [RouterLink, FormsModule, PageHeaderComponent, StatCardComponent, EmptyStateComponent, DataTableComponent, PaginationComponent],
    templateUrl: './clients.component.html'
  })
  export class ClientsComponent implements OnInit, OnDestroy {
    readonly auth = inject(AuthService);
    private readonly service = inject(ClientsService);

    readonly clients = signal<Client[]>([]);
    readonly loading = signal(false);
    readonly error = signal('');
    readonly total = signal(0);
    readonly page = signal(1);

    readonly pageSize = 20;
    readonly statusFilter = signal<ClientStatusFilter>('all');

    search = '';

    private readonly searchSubject = new Subject<string>();
    private readonly destroy$ = new Subject<void>();
    private requestId = 0;

    readonly filteredClients = computed(() => {
      const filter = this.statusFilter();

    if (filter === 'all') {
      return this.clients();
    }

    return this.clients().filter(
      client => client.status === filter
    );
  });

  readonly activeClients = computed(() =>
    this.clients().filter(
      client => client.status === 'active'
    ).length
  );

  readonly inactiveClients = computed(() =>
    this.clients().filter(
      client => client.status !== 'active'
    ).length
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize))
  );

  readonly startItem = computed(() => {
    if (this.total() === 0) return 0;

    return (this.page() - 1) * this.pageSize + 1;
  });

  readonly endItem = computed(() =>
    Math.min(
      this.page() * this.pageSize,
      this.total()
    )
  );

  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.load(1));

    this.load();
  }

  onSearchChange(value: string): void {
    this.search = value;
    this.searchSubject.next(value.trim());
  }

  onStatusChange(value: ClientStatusFilter): void {
    this.statusFilter.set(value);
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter.set('all');
    this.load(1);
  }

  load(page = 1): void {
    if (page < 1) return;

    const currentRequest = ++this.requestId;

    this.loading.set(true);
    this.error.set('');

    this.service.getAll(page, this.search.trim())
      .pipe(
        finalize(() => {
          if (currentRequest === this.requestId) {
            this.loading.set(false);
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: response => {
          if (currentRequest !== this.requestId) return;

          this.clients.set(response.items);
          this.total.set(response.total);
          this.page.set(response.page);
        },
        error: () => {
          if (currentRequest !== this.requestId) return;

          this.clients.set([]);
          this.error.set(
            'No se pudieron cargar los clientes. Intenta nuevamente.'
          );
        }
      });
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.load(this.page() + 1);
    }
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.load(this.page() - 1);
    }
  }

  ngOnDestroy(): void {
    this.requestId++;
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
  }
}
