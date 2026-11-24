
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { LogisticsService } from '../../../services/logistics.service';
import { EventsService } from '../../../services/events.service';
import { InventoryService } from '../../../services/inventory.service';

import {
  LogisticsOrder,
  LogisticsStatus,
  LogisticsStatusHistory
} from '../../../models/logistics.model';

import { Event } from '../../../models/event.model';
import { InventoryItem } from '../../../models/inventory.model';

@Component({
  selector: 'app-logistics-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './logistics-detail.component.html'
})
export class LogisticsDetailComponent implements OnInit {

  private readonly logistics = inject(LogisticsService);
  private readonly eventsService = inject(EventsService);
  private readonly inventoryService = inject(InventoryService);
  private readonly route = inject(ActivatedRoute);

  readonly order = signal<LogisticsOrder | null>(null);
  readonly event = signal<Event | null>(null);

  readonly inventoryItems =
    signal<Record<number, InventoryItem>>({});

  readonly quantities =
    signal<Record<number, number>>({});

  readonly history = signal<LogisticsStatusHistory[]>([]);

  readonly loading = signal(false);
  readonly loadingNames = signal(false);
  readonly loadingHistory = signal(false);
  readonly saving = signal(false);

  readonly error = signal('');
  readonly success = signal('');
  readonly namesWarning = signal('');
  readonly historyError = signal('');

  readonly operationNotes = signal('');

  readonly totalRequired = computed(() =>
    this.order()?.items.reduce(
      (sum, item) => sum + item.quantity_required,
      0
    ) ?? 0
  );

  readonly totalPrepared = computed(() =>
    this.order()?.items.reduce(
      (sum, item) => sum + item.quantity_prepared,
      0
    ) ?? 0
  );

  readonly totalPending = computed(() =>
    Math.max(
      0,
      this.totalRequired() - this.totalPrepared()
    )
  );

  readonly progress = computed(() => {
    const required = this.totalRequired();

    return required
      ? Math.round(this.totalPrepared() / required * 100)
      : 0;
  });

  readonly allPrepared = computed(() => {
    const order = this.order();

    return !!order?.items.length &&
      order.items.every(
        item =>
          item.quantity_prepared === item.quantity_required
      );
  });

  readonly canEditPreparation = computed(() => {
    const status = this.order()?.status;

    return status === 'pending' ||
      status === 'in_progress';
  });

  ngOnInit(): void {
    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Identificador de orden inválido.');
      return;
    }

    this.load(id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.logistics.get(id).subscribe({
      next: order => {
        this.setOrder(order);
        this.loading.set(false);

        this.loadNames(order);
        this.loadHistory(order.id);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.error?.message ||
          'No se pudo cargar la orden logística.'
        );
        this.loading.set(false);
      }
    });
  }

  setOrder(order: LogisticsOrder): void {
    const quantities: Record<number, number> = {};

    for (const item of order.items) {
      quantities[item.id] = item.quantity_prepared;
    }

    this.quantities.set(quantities);
    this.order.set(order);
  }

  loadNames(order: LogisticsOrder): void {
    this.loadingNames.set(true);
    this.namesWarning.set('');

    const ids = [
      ...new Set(
        order.items.map(
          item => item.inventory_item_id
        )
      )
    ];

    const eventRequest = this.eventsService
      .getById(order.event_id)
      .pipe(
        catchError(err => {
          console.warn(
            'No se pudo consultar el evento:',
            err
          );
          return of(null);
        })
      );

    const itemRequests = ids.map(id =>
      this.inventoryService.getById(id).pipe(
        map(item => ({ id, item })),
        catchError(err => {
          console.warn(
            `No se pudo consultar artículo ${id}:`,
            err
          );
          return of({ id, item: null });
        })
      )
    );

    forkJoin({
      event: eventRequest,
      items: itemRequests.length
        ? forkJoin(itemRequests)
        : of([])
    }).subscribe({
      next: result => {
        this.event.set(result.event);

        const inventory:
          Record<number, InventoryItem> = {};

        let missing = 0;

        for (const entry of result.items) {
          if (entry.item) {
            inventory[entry.id] = entry.item;
          } else {
            missing++;
          }
        }

        this.inventoryItems.set(inventory);

        if (!result.event || missing > 0) {
          this.namesWarning.set(
            'Algunos nombres no pudieron consultarse. ' +
            'Se muestran sus identificadores.'
          );
        }

        this.loadingNames.set(false);
      },
      error: err => {
        console.error(err);

        this.loadingNames.set(false);
        this.namesWarning.set(
          'No se pudieron consultar todos los nombres.'
        );
      }
    });
  }

  loadHistory(orderId: number): void {
    this.loadingHistory.set(true);
    this.historyError.set('');

    this.logistics.history(orderId).subscribe({
      next: entries => {
        this.history.set(
          [...entries].sort((a, b) => {
            const dateA = Date.parse(a.created_at);
            const dateB = Date.parse(b.created_at);

            if (
              Number.isFinite(dateA) &&
              Number.isFinite(dateB) &&
              dateA !== dateB
            ) {
              return dateB - dateA;
            }

            return b.id - a.id;
          })
        );

        this.loadingHistory.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.historyError.set(
          err.error?.message ||
          'No se pudo consultar el historial.'
        );
        this.loadingHistory.set(false);
      }
    });
  }

  eventName(): string {
    const order = this.order();

    return this.event()?.name ||
      (order ? `Evento #${order.event_id}` : '');
  }

  itemName(id: number): string {
    return this.inventoryItems()[id]?.name ||
      `Artículo #${id}`;
  }

  itemSku(id: number): string {
    return this.inventoryItems()[id]?.sku || '';
  }

  itemUnit(id: number): string {
    return this.inventoryItems()[id]?.unit || '';
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

  updateQuantity(
    itemId: number,
    value: number | string | null
  ): void {
    const quantity = value === null || value === ''
      ? NaN
      : Number(value);

    this.quantities.update(current => ({
      ...current,
      [itemId]: quantity
    }));
  }

  saveItem(itemId: number): void {
    const order = this.order();

    if (!order || this.saving() || !this.canEditPreparation()) {
      return;
    }

    const item = order.items.find(
      x => x.id === itemId
    );

    const quantity = this.quantities()[itemId];

    if (
      !item ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > item.quantity_required
    ) {
      this.error.set('Cantidad preparada inválida.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.logistics.prepareItem(
      order.id,
      itemId,
      quantity
    ).subscribe({
      next: updatedOrder => {
        this.setOrder(updatedOrder);
        this.saving.set(false);
        this.success.set('Cantidad guardada correctamente.');
        this.loadHistory(updatedOrder.id);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.error?.message ||
          'Error al guardar el artículo.'
        );
        this.saving.set(false);
      }
    });
  }

  changeStatus(status: LogisticsStatus): void {
    const order = this.order();

    if (!order || this.saving()) return;

    if (
      status === 'cancelled' &&
      !window.confirm(
        '¿Deseas cancelar esta orden logística?'
      )
    ) {
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.logistics.changeStatus(
      order.id,
      status
    ).subscribe({
      next: updatedOrder => {
        this.setOrder(updatedOrder);
        this.saving.set(false);
        this.success.set(
          `Estado actualizado: ${this.statusLabel(status)}.`
        );
        this.loadHistory(updatedOrder.id);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.error?.message ||
          'Error al cambiar el estado.'
        );
        this.saving.set(false);
      }
    });
  }

  dispatch(): void {
    const order = this.order();

    if (
      !order ||
      this.saving() ||
      order.status !== 'prepared'
    ) {
      return;
    }

    if (
      !window.confirm(
        '¿Confirmas el despacho de esta orden logística?'
      )
    ) {
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    const notes = this.operationNotes().trim() || null;

    this.logistics.dispatch(order.id, notes).subscribe({
      next: updatedOrder => {
        this.setOrder(updatedOrder);
        this.operationNotes.set('');
        this.saving.set(false);

        this.success.set(
          'La orden fue despachada correctamente.'
        );

        this.loadHistory(updatedOrder.id);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.error?.message ||
          'No se pudo despachar la orden.'
        );
        this.saving.set(false);
      }
    });
  }

  deliver(): void {
    const order = this.order();

    if (
      !order ||
      this.saving() ||
      order.status !== 'dispatched'
    ) {
      return;
    }

    if (
      !window.confirm(
        '¿Confirmas que el inventario fue entregado?'
      )
    ) {
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    const notes = this.operationNotes().trim() || null;

    this.logistics.deliver(order.id, notes).subscribe({
      next: updatedOrder => {
        this.setOrder(updatedOrder);
        this.operationNotes.set('');
        this.saving.set(false);

        this.success.set(
          'La entrega fue confirmada correctamente.'
        );

        this.loadHistory(updatedOrder.id);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.error?.message ||
          'No se pudo confirmar la entrega.'
        );
        this.saving.set(false);
      }
    });
  }
}
