
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, finalize } from 'rxjs';

import {
  InventoryReservationsService,
  InventoryItem,
  InventoryAvailability,
  InventoryReservation
} from '../../../../services/inventory-reservations.service';

import { AuthService } from '../../../../services/auth.service';
import { EventStatus } from '../../../../models/event.model';

import { EventInventoryMovementsComponent }
  from '../../event-inventory-movements.component';

@Component({
  selector: 'app-event-inventory-reservations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EventInventoryMovementsComponent
  ],
  templateUrl: './event-inventory-reservations.component.html'
})
export class EventInventoryReservationsComponent
  implements OnChanges {

  @Input({ required: true }) eventId!: number;
  @Input({ required: true }) startsAt!: string;
  @Input({ required: true }) endsAt!: string;
  @Input({ required: true }) eventStatus!: EventStatus;

  private readonly service = inject(InventoryReservationsService);
  readonly auth = inject(AuthService);

  readonly items = signal<InventoryItem[]>([]);
  readonly reservations = signal<InventoryReservation[]>([]);
  readonly availability = signal<InventoryAvailability | null>(null);

  readonly loading = signal(false);
  readonly checking = signal(false);
  readonly saving = signal(false);

  readonly error = signal('');
  readonly success = signal('');

  readonly selectedItemId = signal<number | null>(null);
  readonly quantity = signal(1);
  readonly expandedReservationId = signal<number | null>(null);

  private loadVersion = 0;
  private availabilityVersion = 0;

  readonly activeReservations = computed(() =>
    this.reservations().filter(r => r.status === 'reserved')
  );

  readonly currentReservation = computed(() =>
    this.activeReservations().find(
      r => r.inventory_item_id === this.selectedItemId()
    )
  );

  readonly availableForEvent = computed(() => {
    const available = this.availability()?.quantity_available ?? 0;
    const reserved = this.currentReservation()?.quantity ?? 0;
    return available + reserved;
  });

  readonly canCreate = computed(() =>
    this.auth.hasPermission('inventory.create') &&
    this.eventStatus !== 'cancelled' &&
    this.eventStatus !== 'completed'
  );

  readonly canCancel = computed(() =>
    this.auth.hasPermission('inventory.update') &&
    this.eventStatus !== 'cancelled' &&
    this.eventStatus !== 'completed' &&
    !this.saving()
  );

  readonly canSave = computed(() =>
    this.canCreate() &&
    !this.loading() &&
    !this.checking() &&
    !this.saving() &&
    this.selectedItemId() !== null &&
    this.availability() !== null &&
    this.availability()?.is_active !== false &&
    Number.isInteger(this.quantity()) &&
    this.quantity() > 0 &&
    this.quantity() <= this.availableForEvent()
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId']) {
      this.selectedItemId.set(null);
      this.availability.set(null);
      this.reservations.set([]);
      this.expandedReservationId.set(null);
      this.loadData();
    } else if (changes['startsAt'] || changes['endsAt']) {
      this.refreshAvailability();
    }
  }

  loadData(): void {
    if (!this.eventId) return;

    const version = ++this.loadVersion;
    const currentEventId = this.eventId;

    this.loading.set(true);
    this.error.set('');

    forkJoin({
      items: this.service.getItems(),
      reservations: this.service.getReservations(currentEventId)
    })
      .pipe(finalize(() => {
        if (version === this.loadVersion) {
          this.loading.set(false);
        }
      }))
      .subscribe({
        next: result => {
          if (
            version !== this.loadVersion ||
            currentEventId !== this.eventId
          ) return;

          this.items.set(
            result.items.items.filter(item => item.is_active)
          );

          this.reservations.set(result.reservations);
          this.refreshAvailability();
        },
        error: err => {
          if (version !== this.loadVersion) return;
          console.error('Error cargando inventario:', err);
          this.error.set('No se pudo cargar el inventario del evento.');
        }
      });
  }

  onItemChange(value: number | null): void {
    this.selectedItemId.set(value);
    this.quantity.set(this.currentReservation()?.quantity ?? 1);
    this.error.set('');
    this.success.set('');
    this.refreshAvailability();
  }

  refreshAvailability(): void {
    const version = ++this.availabilityVersion;
    const itemId = this.selectedItemId();

    this.availability.set(null);
    this.checking.set(false);

    if (
      itemId === null ||
      !this.startsAt ||
      !this.endsAt
    ) return;

    this.checking.set(true);

    this.service.getAvailability(
      itemId,
      this.startsAt,
      this.endsAt
    ).subscribe({
      next: result => {
        if (version !== this.availabilityVersion) return;
        this.availability.set(result);
        this.checking.set(false);
      },
      error: err => {
        if (version !== this.availabilityVersion) return;
        console.error('Error consultando disponibilidad:', err);
        this.error.set('No se pudo consultar la disponibilidad.');
        this.checking.set(false);
      }
    });
  }

  save(): void {
    if (!this.canSave()) return;

    const itemId = this.selectedItemId();
    if (itemId === null) return;

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.service.saveReservation(
      this.eventId,
      itemId,
      this.quantity()
    )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.success.set('Reservación guardada correctamente.');
          this.loadData();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(
            err.status === 409
              ? 'No hay suficiente inventario para esta reservación.'
              : err.status === 403
                ? 'No tienes permisos para guardar reservaciones.'
                : 'No se pudo guardar la reservación.'
          );
          this.refreshAvailability();
        }
      });
  }

  cancel(reservation: InventoryReservation): void {
    if (!this.canCancel() || reservation.status !== 'reserved') return;

    if (!window.confirm(
      `¿Cancelar la reservación de ${reservation.quantity} unidades?`
    )) return;

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.service.cancelReservation(this.eventId, reservation.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.success.set('Reservación cancelada correctamente.');
          this.loadData();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(
            err.status === 409
              ? 'La reservación tiene movimientos pendientes.'
              : 'No se pudo cancelar la reservación.'
          );
        }
      });
  }

  toggleMovements(reservationId: number): void {
    this.expandedReservationId.update(current =>
      current === reservationId ? null : reservationId
    );
  }

  itemName(itemId: number): string {
    return this.items().find(item => item.id === itemId)?.name
      ?? `Artículo #${itemId}`;
  }

  itemSku(itemId: number): string {
    return this.items().find(item => item.id === itemId)?.sku ?? '';
  }
}
