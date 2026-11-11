
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { LogisticsService } from '../../../services/logistics.service';
import { EventsService } from '../../../services/events.service';

import {
  LogisticsOrder,
  LogisticsStatus
} from '../../../models/logistics.model';

@Component({
  selector: 'app-logistics-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './logistics-list.component.html'
})
export class LogisticsListComponent implements OnInit {

  private readonly logistics = inject(LogisticsService);
  private readonly eventsService = inject(EventsService);

  readonly orders = signal<LogisticsOrder[]>([]);
  readonly eventNames = signal<Record<number, string>>({});

  readonly loading = signal(false);
  readonly loadingEventNames = signal(false);
  readonly error = signal('');

  readonly search = signal('');
  readonly selectedStatus = signal<LogisticsStatus | 'all'>('all');

  readonly statuses: {
    value: LogisticsStatus | 'all';
    label: string;
  }[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En preparación' },
    { value: 'prepared', label: 'Preparada' },
    { value: 'dispatched', label: 'Despachada' },
    { value: 'delivered', label: 'Entregada' },
    { value: 'cancelled', label: 'Cancelada' }
  ];

  readonly filteredOrders = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.selectedStatus();

    return this.orders().filter(order => {

      const matchesStatus =
        status === 'all' || order.status === status;

      const eventName = (
        this.eventNames()[order.event_id] || ''
      ).toLowerCase();

      const matchesSearch =
        !term ||
        String(order.id).includes(term) ||
        String(order.event_id).includes(term) ||
        eventName.includes(term);

      return matchesStatus && matchesSearch;
    });
  });

  readonly totalOrders = computed(() => this.orders().length);

  readonly pendingCount = computed(() =>
    this.orders().filter(o => o.status === 'pending').length
  );

  readonly inProgressCount = computed(() =>
    this.orders().filter(o => o.status === 'in_progress').length
  );

  readonly preparedCount = computed(() =>
    this.orders().filter(o => o.status === 'prepared').length
  );

  readonly dispatchedCount = computed(() =>
    this.orders().filter(o => o.status === 'dispatched').length
  );

  readonly deliveredCount = computed(() =>
    this.orders().filter(o => o.status === 'delivered').length
  );

  readonly cancelledCount = computed(() =>
    this.orders().filter(o => o.status === 'cancelled').length
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    this.logistics.list().subscribe({
      next: orders => {
        this.orders.set(orders);
        this.loading.set(false);
        this.loadEventNames(orders);
      },
      error: (err: HttpErrorResponse) => {
        console.error('[LOGISTICS LIST]', err);

        this.error.set(
          err.error?.message ||
          'No se pudieron cargar las órdenes logísticas.'
        );

        this.loading.set(false);
      }
    });
  }

  loadEventNames(orders: LogisticsOrder[]): void {
    const ids = [
      ...new Set(orders.map(order => order.event_id))
    ];

    const missing = ids.filter(
      id => !this.eventNames()[id]
    );

    if (!missing.length) {
      this.loadingEventNames.set(false);
      return;
    }

    this.loadingEventNames.set(true);

    const requests = missing.map(id =>
      this.eventsService.getById(id).pipe(
        map(event => ({
          id,
          name: event.name
        })),
        catchError(err => {
          console.warn(
            `No se pudo consultar evento ${id}`,
            err
          );

          return of({
            id,
            name: `Evento #${id}`
          });
        })
      )
    );

    forkJoin(requests).subscribe({
      next: results => {
        const names: Record<number, string> = {};

        for (const result of results) {
          names[result.id] = result.name;
        }

        this.eventNames.update(current => ({
          ...current,
          ...names
        }));

        this.loadingEventNames.set(false);
      },
      error: err => {
        console.error(err);
        this.loadingEventNames.set(false);
      }
    });
  }

  eventName(eventId: number): string {
    return this.eventNames()[eventId] ||
      `Evento #${eventId}`;
  }

  progress(order: LogisticsOrder): number {
    const required = order.items.reduce(
      (sum, item) => sum + item.quantity_required,
      0
    );

    const prepared = order.items.reduce(
      (sum, item) => sum + item.quantity_prepared,
      0
    );

    return required
      ? Math.round(prepared / required * 100)
      : 0;
  }

  statusLabel(status: LogisticsStatus): string {
    const labels: Record<LogisticsStatus, string> = {
      pending: 'Pendiente',
      in_progress: 'En preparación',
      prepared: 'Preparada',
      dispatched: 'Despachada',
      delivered: 'Entregada',
      cancelled: 'Cancelada'
    };

    return labels[status];
  }

  statusClasses(status: LogisticsStatus): string {
    const classes: Record<LogisticsStatus, string> = {
      pending: 'bg-amber-100 text-amber-800',
      in_progress: 'bg-blue-100 text-blue-800',
      prepared: 'bg-green-100 text-green-800',
      dispatched: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return classes[status];
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedStatus.set('all');
  }
}
