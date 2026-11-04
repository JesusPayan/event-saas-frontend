
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

import { AuthService } from '../../services/auth.service';

import { EventStatus } from '../../models/event.model';


import {
  InventoryMovementsService
} from '../../services/inventory-movements.service'

import {
  InventoryMovement,
  InventoryMovementSummary,
  InventoryMovementType
} from '../../models/inventory-movement.model';

@Component({
  selector: 'app-event-inventory-movements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  template: `
    <section class="card mt-3">
      <div class="card-body">

        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 class="card-title mb-1">
              Control de entregas y devoluciones
            </h5>

            <small class="text-muted">
              Reservación #{{ reservationId }}
            </small>
          </div>

          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            (click)="loadMovements()"
            [disabled]="loading || saving">
            Actualizar
          </button>
        </div>

        <!-- MENSAJES -->
        <div *ngIf="error" class="alert alert-danger">
          {{ error }}
        </div>

        <div *ngIf="success" class="alert alert-success">
          {{ success }}
        </div>

        <div *ngIf="loading" class="text-muted mb-3">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Cargando movimientos...
        </div>

        <!-- RESUMEN -->
        <div class="row g-2 mb-3">

          <div class="col-6 col-md-3">
            <div class="border rounded p-3 text-center">
              <h4 class="mb-1">
                {{ reservedQuantity }}
              </h4>
              <small class="text-muted">
                Reservadas
              </small>
            </div>
          </div>

          <div class="col-6 col-md-3">
            <div class="border rounded p-3 text-center">
              <h4 class="mb-1">
                {{ summary.quantity_dispatched }}
              </h4>
              <small class="text-muted">
                Entregadas
              </small>
            </div>
          </div>

          <div class="col-6 col-md-3">
            <div class="border rounded p-3 text-center">
              <h4 class="mb-1">
                {{ summary.quantity_returned }}
              </h4>
              <small class="text-muted">
                Devueltas
              </small>
            </div>
          </div>

          <div class="col-6 col-md-3">
            <div class="border rounded p-3 text-center">
              <h4 class="mb-1">
                {{ summary.quantity_outstanding }}
              </h4>
              <small class="text-muted">
                Pendientes
              </small>
            </div>
          </div>

        </div>

        <!-- FORMULARIO -->
        <div *ngIf="auth.hasPermission('inventory.update')">

          <div class="row g-3">

            <div class="col-md-4">
              <label class="form-label">
                Tipo de movimiento
              </label>

              <select
                class="form-select"
                [(ngModel)]="movementType"
                (ngModelChange)="quantity = 1"
                [disabled]="loading || saving">

                <option value="dispatch">
                  Entrega
                </option>

                <option value="return">
                  Devolución
                </option>

              </select>
            </div>

            <div class="col-md-3">
              <label class="form-label">
                Cantidad
              </label>

              <input
                type="number"
                class="form-control"
                [(ngModel)]="quantity"
                min="1"
                step="1"
                [max]="maxQuantity"
                [disabled]="loading || saving">

              <small class="text-muted">
                Máximo: {{ maxQuantity }}
              </small>
            </div>

            <div class="col-md-5">
              <label class="form-label">
                Observaciones
              </label>

              <textarea
                class="form-control"
                [(ngModel)]="notes"
                rows="2"
                maxlength="2000"
                [disabled]="loading || saving">
              </textarea>
            </div>

          </div>

          <div class="mt-3">

            <button
              type="button"
              class="btn btn-primary"
              (click)="saveMovement()"
              [disabled]="!canSave">

              <span
                *ngIf="saving"
                class="spinner-border spinner-border-sm me-2">
              </span>

              {{
                saving
                  ? 'Guardando...'
                  : movementType === 'dispatch'
                    ? 'Registrar entrega'
                    : 'Registrar devolución'
              }}

            </button>

          </div>

          <div
            *ngIf="
              movementType === 'dispatch' &&
              !canDispatch
            "
            class="alert alert-secondary mt-3 mb-0">

            No se pueden registrar nuevas entregas
            para esta reservación o evento.

          </div>

        </div>

        <div
          *ngIf="!auth.hasPermission('inventory.update')"
          class="alert alert-secondary">

          Tienes permiso para consultar los movimientos,
          pero no para registrar entregas o devoluciones.

        </div>

        <hr class="my-4">

        <!-- HISTORIAL -->
        <h6 class="mb-3">
          Historial de movimientos
        </h6>

        <div
          *ngIf="!loading && movements.length === 0"
          class="text-muted">

          No hay movimientos registrados.

        </div>

        <div
          *ngIf="movements.length > 0"
          class="table-responsive">

          <table class="table table-sm table-striped align-middle">

            <thead>
              <tr>
                <th>Fecha</th>
                <th>Movimiento</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Observaciones</th>
              </tr>
            </thead>

            <tbody>

              <tr *ngFor="let movement of movements">

                <td>
                  {{
                    movement.created_at |
                    date:'dd/MM/yyyy HH:mm'
                  }}
                </td>

                <td>
                  <span
                    class="badge"
                    [ngClass]="{
                      'bg-primary':
                        movement.movement_type === 'dispatch',
                      'bg-success':
                        movement.movement_type === 'return'
                    }">

                    {{
                      movement.movement_type === 'dispatch'
                        ? 'Entrega'
                        : 'Devolución'
                    }}

                  </span>
                </td>

                <td>
                  {{ movement.quantity }}
                </td>

                <td>
                  {{ movement.created_by }}
                </td>

                <td>
                  {{ movement.notes || '-' }}
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>
    </section>
  `
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
