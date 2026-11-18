
import {
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';

import { EventsService } from '../../../services/events.service';
import { Event, EventsPage } from '../../../models/event.model';
import { AuthService } from '../../../services/auth.service';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card';
import { DataTableComponent } from '../../../shared/components/data-table/data-table'
import {PaginationComponent}  from '../../../shared/components/pagination/pagination';
type EventStatus =
  | 'draft'
  | 'quoted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

type EventStatusFilter = 'all' | EventStatus;

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    PageHeaderComponent,
    StatCardComponent,
    DataTableComponent,
    PaginationComponent
  ],
  templateUrl: './events.component.html'
})
export class EventsComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly service = inject(EventsService);
  private readonly destroy$ = new Subject<void>();
  readonly events = signal<Event[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly search = signal('');
  readonly statusFilter = signal<EventStatusFilter>('all');
  readonly page = signal(1);
  readonly pageSize = 10;
  eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    wedding: 'Boda',
    birthday: 'Cumpleaños',
    corporate: 'Corporativo',
    graduation: 'Graduación',
    anniversary: 'Aniversario',
    other: 'Otro'
  };

  return labels[type] ?? type;
}
  readonly draftCount = computed(() =>
    this.events().filter(e => e.status === 'draft').length
  );

  readonly confirmedCount = computed(() =>
    this.events().filter(e => e.status === 'confirmed').length
  );

  readonly inProgressCount = computed(() =>
    this.events().filter(e => e.status === 'in_progress').length
  );

  readonly completedCount = computed(() =>
    this.events().filter(e => e.status === 'completed').length
  );

  readonly cancelledCount = computed(() =>
    this.events().filter(e => e.status === 'cancelled').length
  );

  readonly filteredEvents = computed(() => {
    const query = this.normalize(this.search().trim());
    const status = this.statusFilter();

    return this.events().filter(event => {
      const searchable = this.normalize([
        event.name,
        event.event_type,
        event.location ?? ''
      ].join(' '));

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        status === 'all' || event.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  readonly filteredTotal = computed(() =>
    this.filteredEvents().length
  );

  readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.filteredTotal() / this.pageSize)
    )
  );

  readonly paginatedEvents = computed(() => {
    const start = (this.page() - 1) * this.pageSize;

    return this.filteredEvents().slice(
      start,
      start + this.pageSize
    );
  });

  readonly hasActiveFilters = computed(() =>
    this.search().trim() !== '' ||
    this.statusFilter() !== 'all'
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.list()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (response: EventsPage) => {
          this.events.set(response.items);
          this.total.set(response.total);
          this.page.set(1);
        },
        error: err => {
          console.error('Error loading events', err);
          this.error.set(
            'No se pudieron cargar los eventos.'
          );
        }
      });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  onStatusChange(value: EventStatusFilter): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.page.set(1);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.page.set(page);
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      quoted: 'Cotizado',
      confirmed: 'Confirmado',
      in_progress: 'En progreso',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };

    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      quoted: 'bg-amber-100 text-amber-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return classes[status] ?? 'bg-gray-100 text-gray-700';
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
