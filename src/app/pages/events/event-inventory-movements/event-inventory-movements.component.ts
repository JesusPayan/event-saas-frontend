
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import {
  Subject,
  finalize,
  takeUntil
} from 'rxjs';

import { AuthService } from '../../../services/auth.service';

import { EventStatus } from '../../../models/event.model';


import {
  InventoryMovementsService
} from '../../../services/inventory-movements.service'

import {
  InventoryMovement,
  InventoryMovementSummary,
  InventoryMovementType
} from '../../../models/inventory-movement.model';

@Component({
  selector: 'app-event-inventory-movements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './event-inventory-movements.component.html'
})
export class EventInventoryMovementsComponent
  implements OnChanges, OnDestroy {

  @Input({ required: true })
  reservationId!: number;

  @Input({ required: true })
  reservedQuantity!: number;

  @Input()
  reservationStatus = 'reserved';

  @Input()
  eventStatus: EventStatus = 'draft';

  readonly auth = inject(AuthService);

  private readonly movementsService =
    inject(InventoryMovementsService);

  private readonly destroy$ = new Subject<void>();

  movements: InventoryMovement[] = [];

  summary: InventoryMovementSummary = {
    quantity_dispatched: 0,
    quantity_returned: 0,
    quantity_outstanding: 0
  };

  movementType: InventoryMovementType = 'dispatch';

  quantity = 1;
  notes = '';

  loading = false;
  saving = false;
  loaded = false;

  error = '';
  success = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationId']) {
      this.movements = [];

      this.summary = {
        quantity_dispatched: 0,
        quantity_returned: 0,
        quantity_outstanding: 0
      };

      this.loaded = false;
      this.loadMovements();
    }
  }

  get canDispatch(): boolean {
    return (
      this.reservationStatus === 'reserved' &&
      this.eventStatus !== 'cancelled' &&
      this.eventStatus !== 'completed'
    );
  }

  get maxQuantity(): number {

    if (this.movementType === 'dispatch') {
      return Math.max(
        0,
        this.reservedQuantity -
        this.summary.quantity_dispatched
      );
    }

    return Math.max(
      0,
      this.summary.quantity_outstanding
    );
  }

  get canSave(): boolean {

    if (
      !this.auth.hasPermission('inventory.update') ||
      this.loading ||
      this.saving ||
      !this.loaded
    ) {
      return false;
    }

    if (
      this.movementType === 'dispatch' &&
      !this.canDispatch
    ) {
      return false;
    }

    return (
      Number.isInteger(this.quantity) &&
      this.quantity > 0 &&
      this.quantity <= this.maxQuantity
    );
  }

  loadMovements(): void {

    if (!this.reservationId || this.saving) {
      return;
    }

    this.loading = true;
    this.loaded = false;
    this.error = '';

    this.movementsService
      .getMovements(this.reservationId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({

        next: response => {
          this.movements = response.items;
          this.summary = response.summary;
          this.loaded = true;
        },

        error: (err: HttpErrorResponse) => {
          this.loaded = false;

          this.error =
            err.status === 403
              ? 'No tienes permisos para consultar los movimientos.'
              : 'No fue posible cargar los movimientos.';
        }

      });
  }

  saveMovement(): void {

    if (!this.canSave) {
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const payload = {
      reservation_id: this.reservationId,
      quantity: this.quantity,
      notes: this.notes.trim()
    };

    const request$ =
      this.movementType === 'dispatch'
        ? this.movementsService.dispatch(payload)
        : this.movementsService.returnItems(payload);

    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({

        next: response => {
          this.success = 'Movimiento registrado correctamente.';
          this.quantity = 1;
          this.notes = '';

          this.summary = response.summary;
          this.movements = [
            response.movement,
            ...this.movements
          ];
        },

        error: (err: HttpErrorResponse) => {

          if (err.status === 409) {
            this.error =
              'Conflicto de inventario. Verifica las cantidades disponibles o pendientes.';
          } else if (err.status === 403) {
            this.error =
              'No tienes permisos para registrar este movimiento.';
          } else if (err.status === 404) {
            this.error =
              'No se encontró la reservación.';
          } else {
            this.error =
              'No fue posible registrar el movimiento.';
          }
        }

      });
  }

  

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
