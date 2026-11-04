
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { OnDestroy } from '@angular/core';

import {
  InventoryOperation
} from '../../../models/inventory-operation.model';

import {
  InventoryMovementsService
} from '../../../services/inventory-movements.service';

import type {
  InventoryMovement,
  MovementSummary
} from '../../../models/inventory-movement.model';

type MovementType = 'dispatch' | 'return';

@Component({
  selector: 'app-inventory-movement-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl:
    './inventory-movement-manager.component.html',
  styleUrl:
    './inventory-movement-manager.component.css'
})
export class InventoryMovementManagerComponent
  implements OnChanges, OnDestroy {

  @Input({ required: true })
  operation!: InventoryOperation;

  @Input()
  canUpdate = false;

  @Output()
  movementRegistered = new EventEmitter<void>();

  private readonly service =
    inject(InventoryMovementsService);

  private historySubscription?: Subscription;
  private saveSubscription?: Subscription;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly movements =
    signal<InventoryMovement[]>([]);

  readonly summary =
    signal<MovementSummary | null>(null);

  movementType: MovementType = 'dispatch';
  quantity: number | null = null;
  notes = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['operation'] &&
      this.operation
    ) {
      this.resetForm();
      this.loadHistory();
    }
  }

  ngOnDestroy(): void {
    this.historySubscription?.unsubscribe();
    this.saveSubscription?.unsubscribe();
  }

  get remainingDispatch(): number {
    const dispatched =
      this.summary()?.quantity_dispatched
      ?? this.operation.quantity_dispatched;

    return Math.max(
      0,
      this.operation.quantity_reserved - dispatched
    );
  }

  get outstanding(): number {
    return Math.max(
      0,
      this.summary()?.quantity_outstanding
      ?? this.operation.quantity_outstanding
    );
  }

  get canDispatch(): boolean {
    return (
      this.canUpdate &&
      this.operation.reservation_status === 'reserved' &&
      !['cancelled', 'completed'].includes(
        this.operation.event_status
      ) &&
      this.remainingDispatch > 0
    );
  }

  get canReturn(): boolean {
    return this.canUpdate && this.outstanding > 0;
  }

  get maxQuantity(): number {
    return this.movementType === 'dispatch'
      ? this.remainingDispatch
      : this.outstanding;
  }

  resetForm(): void {
    this.movementType = 'dispatch';
    this.quantity = null;
    this.notes = '';
    this.error.set('');
    this.success.set('');
  }

  setMovementType(type: MovementType): void {
    this.movementType = type;
    this.quantity = null;
    this.error.set('');
  }

 loadHistory(clearError = true): void {
  this.historySubscription?.unsubscribe();

  this.loading.set(true);

  if (clearError) {
    this.error.set('');
  }

  this.movements.set([]);
  this.summary.set(null);

  const reservationId =
    this.operation.reservation_id;

  this.historySubscription = this.service
    .getHistory(reservationId)
    .subscribe({
      next: response => {
        if (
          this.operation.reservation_id !==
          reservationId
        ) {
          return;
        }

        this.movements.set(response.items);
        this.summary.set(response.summary);
        this.loading.set(false);
      },

      error: err => {
        console.error(
          'Error consultando movimientos:',
          err
        );

        this.error.set(
          'No fue posible actualizar el historial.'
        );

        this.loading.set(false);
      }
    });
}

 
  save(): void {
  if (
    !this.canUpdate ||
    this.saving() ||
    this.loading()
  ) {
    return;
  

  // Continúa aquí el resto
  // de tu implementación actual.
}
    if (
      this.movementType === 'dispatch'
      && !this.canDispatch
    ) {
      this.error.set(
        'Esta reservación no permite nuevas entregas.'
      );
      return;
    }

    if (
      this.movementType === 'return'
      && !this.canReturn
    ) {
      this.error.set(
        'No existen unidades pendientes de devolver.'
      );
      return;
    }

    if (
      this.quantity === null ||
      !Number.isInteger(this.quantity) ||
      this.quantity <= 0 ||
      this.quantity > this.maxQuantity
    ) {
      this.error.set(
        `La cantidad debe estar entre 1 y ${this.maxQuantity}.`
      );
      return;
    }

    if (this.notes.length > 2000) {
      this.error.set(
        'Las observaciones no pueden superar 2000 caracteres.'
      );
      return;
    }

    const payload = {
      reservation_id: this.operation.reservation_id,
      quantity: this.quantity,
      notes: this.notes.trim()
    };

    const request$ =
      this.movementType === 'dispatch'
        ? this.service.dispatch(payload)
        : this.service.returnInventory(payload);

    const savedType = this.movementType;
    const reservationId =
      this.operation.reservation_id;

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.saveSubscription = request$.subscribe({
      next: response => {
        this.saving.set(false);

        if (
          this.operation.reservation_id !==
          reservationId
        ) {
          this.movementRegistered.emit();
          return;
        }

        this.summary.set(response.summary);
        this.quantity = null;
        this.notes = '';

        this.success.set(
          savedType === 'dispatch'
            ? 'Entrega registrada correctamente.'
            : 'Devolución registrada correctamente.'
        );

        this.movementRegistered.emit();
        this.loadHistory();
      },

      error: (err: HttpErrorResponse) => {
        this.saving.set(false);

        const code = err.error?.error;

        const messages: Record<string, string> = {
          reservation_not_found:
            'La reservación ya no existe.',
          reservation_not_active:
            'La reservación no está activa.',
          event_not_dispatchable:
            'El evento no permite entregas.',
          dispatch_exceeds_reservation:
            'La entrega supera las unidades disponibles.',
          return_exceeds_outstanding:
            'La devolución supera las unidades pendientes.',
          nothing_to_return:
            'No hay unidades pendientes de devolver.',
          invalid_payload:
            'Los datos enviados no son válidos.'
        };

        this.error.set(
          messages[code] ??
          'No fue posible registrar el movimiento.'
        );

        // Refrescar saldos después de un conflicto.
        if (err.status === 409) {
  this.loadHistory(false);
}
      }
    });
  }
}
