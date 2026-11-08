import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  InventoryIncidentsService,
  InventoryIncident,
  IncidentCharge
} from '../../../services/inventory-incidents.service';
import { AuthService } from '../../../services/auth.service';
import { InventoryMovementsService } from '../../../services/inventory-movements.service';
import {
  InventoryMovementSummary
} from '../../../models/inventory-movement.model';
interface EventOption {
  id: number;
  name?: string;
  title?: string;
  event_name?: string;
  status?: string;
}

interface ReservationOption {
  id: number;
  event_id: number;
  inventory_item_id: number;
  quantity: number;
  status: string;
  inventory_item?: { name?: string; sku?: string };
  item?: { name?: string; sku?: string };
  inventory_item_name?: string;
  item_name?: string;
}

interface InventoryItemOption {
  id: number;
  name: string;
  sku?: string;
}

interface PagedResponse<T> { items: T[]; }
type CollectionResponse<T> = T[] | PagedResponse<T>;

interface ReconciliationResponse {
  capacity?: { shortage_quantity?: number };
}

@Component({
  selector: 'app-inventory-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventory-incidents.component.html',
  styleUrl: './inventory-incidents.component.css'
})
export class InventoryIncidentsComponent implements OnInit {
  private readonly movementsService = inject(InventoryMovementsService);

readonly loadingMovements = signal(false);
readonly movementsError = signal('');


readonly movementSummary =
  signal<InventoryMovementSummary | null>(null);

  private readonly service = inject(InventoryIncidentsService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly incidents = signal<InventoryIncident[]>([]);
  readonly incidentCharges = signal<IncidentCharge[]>([]);
  readonly events = signal<EventOption[]>([]);
  readonly eventReservations = signal<ReservationOption[]>([]);
  readonly inventoryNames = signal<Record<number, string>>({});

  readonly error = signal('');
  readonly success = signal('');
  readonly saving = signal(false);
  readonly reconciling = signal(false);
  readonly loadingCharges = signal(false);
  readonly loadingEvents = signal(false);
  readonly loadingReservations = signal(false);
  readonly selectedIncident = signal<InventoryIncident | null>(null);
private movementRequestId = 0;
  loadIncidentMovements(reservationId: number): void {
  const requestId = ++this.movementRequestId;

  this.movementSummary.set(null);
  this.loadingMovements.set(true);
  this.movementsError.set('');

  this.movementsService.getMovements(reservationId).subscribe({
    next: response => {
      if (
        requestId !== this.movementRequestId ||
        this.selectedIncident()?.reservation_id !== reservationId
      ) {
        return;
      }

      this.movementSummary.set(response.summary);
      this.loadingMovements.set(false);
    },
    error: err => {
      if (requestId !== this.movementRequestId) return;

      this.loadingMovements.set(false);
      this.movementsError.set(
        err.error?.error ||
        'No fue posible consultar los movimientos.'
      );
    }
  });
}
  readonly canReconcile = computed(() =>
    this.auth.hasPermission('inventory.adjust')
  );

  readonly deficitConfirmation = signal<{
    incidentId: number;
    unitCost: string;
  } | null>(null);

  selectedEventId: number | null = null;
  reservationId: number | null = null;
  quantity = 1;
  incidentType: 'damaged' | 'lost' | 'missing' = 'damaged';
  description = '';
  reconciliationCost: string | number | null = '';

  ngOnInit(): void {
    this.load();
    this.loadEvents();
    this.loadInventoryNames();
  }

  load(): void {
    this.service.list().subscribe({
      next: response => this.incidents.set(response.items ?? []),
      error: (err: HttpErrorResponse) => {
        this.error.set(this.apiError(err, 'Error al consultar incidencias.'));
      }
    });
  }

  loadEvents(): void {
    this.loadingEvents.set(true);
    this.http.get<PagedResponse<EventOption>>('/api/v1/events', {
      params: { page: '1', per_page: '100' }
    }).subscribe({
      next: response => {
        this.events.set(response.items ?? []);
        this.loadingEvents.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingEvents.set(false);
        this.error.set(this.apiError(err, 'No fue posible consultar los eventos.'));
      }
    });
  }

  loadInventoryNames(): void {
    this.http.get<PagedResponse<InventoryItemOption>>('/api/v1/inventory/items', {
      params: { page: '1', per_page: '100' }
    }).subscribe({
      next: response => {
        const names: Record<number, string> = {};
        for (const item of response.items ?? []) {
          names[item.id] = item.sku ? `${item.name} (${item.sku})` : item.name;
        }
        this.inventoryNames.set(names);
      },
      error: () => {
        // Los nombres son datos auxiliares; no bloquean el registro.
      }
    });
  }

  onEventChange(): void {
    this.reservationId = null;
    this.eventReservations.set([]);
    const eventId = this.selectedEventId;

    if (eventId == null) {
      this.loadingReservations.set(false);
      return;
    }

    this.loadingReservations.set(true);
    this.error.set('');
    this.http.get<CollectionResponse<ReservationOption>>(
      `/api/v1/events/${eventId}/reservations`
    ).subscribe({
      next: response => {
        if (this.selectedEventId !== eventId) return;
        const reservations = Array.isArray(response) ? response : response.items ?? [];
        this.eventReservations.set(reservations.filter(
          r => r.status === 'reserved' && r.event_id === eventId
        ));
        this.loadingReservations.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (this.selectedEventId !== eventId) return;
        this.loadingReservations.set(false);
        this.error.set(this.apiError(err, 'No fue posible consultar las reservaciones.'));
      }
    });
  }

  eventLabel(event: EventOption): string {
    const name = event.name || event.title || event.event_name || `Evento #${event.id}`;
    return `${name} (#${event.id})`;
  }

  reservationLabel(reservation: ReservationOption): string {
    const name = reservation.inventory_item?.name || reservation.item?.name ||
      reservation.inventory_item_name || reservation.item_name ||
      this.inventoryNames()[reservation.inventory_item_id] ||
      `Artículo #${reservation.inventory_item_id}`;
    return `${name} — ${reservation.quantity} unidades (reserva #${reservation.id})`;
  }

  create(): void {
    const reservation = this.eventReservations().find(r => r.id === this.reservationId);
    if (this.saving() || !this.selectedEventId || !Number.isInteger(this.reservationId) ||
        !reservation || reservation.event_id !== this.selectedEventId ||
        !Number.isInteger(this.quantity) || this.quantity <= 0 ||
        !this.description.trim()) {
      this.error.set('Selecciona un evento, una reservación válida y completa los datos.');
      return;
    }
    if (this.quantity > reservation.quantity) {
      this.error.set(`La cantidad no puede superar las ${reservation.quantity} unidades reservadas.`);
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.service.create({
      reservation_id: reservation.id,
      incident_type: this.incidentType,
      quantity: this.quantity,
      description: this.description.trim()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set('Incidencia registrada correctamente.');
        this.description = '';
        this.quantity = 1;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(this.apiError(err, 'Error al registrar incidencia.'));
      }
    });
  }

  openReconciliation(incident: InventoryIncident): void {
  if (this.reconciling()) return;

  this.deficitConfirmation.set(null);
  this.selectedIncident.set(incident);
  this.reconciliationCost = incident.unit_cost ?? '';

  this.incidentCharges.set([]);
  this.error.set('');
  this.success.set('');

  this.loadIncidentMovements(incident.reservation_id);
}

  closeReconciliation(): void {
  if (this.reconciling()) return;

  this.deficitConfirmation.set(null);
  this.selectedIncident.set(null);
  this.incidentCharges.set([]);
  this.movementSummary.set(null);
  this.movementsError.set('');
  this.loadingMovements.set(false);
  this.movementRequestId++;
}

  get estimatedReconciliationTotal(): number {
    return Number(this.reconciliationCost || 0) * (this.selectedIncident()?.quantity ?? 0);
  }

  viewIncidentCharges(incident: InventoryIncident): void {
    if (this.reconciling()) return;
    this.deficitConfirmation.set(null);
    this.selectedIncident.set(incident);
    this.incidentCharges.set([]);
    this.loadingCharges.set(true);
    this.error.set('');
    this.service.getCharges(incident.id).subscribe({
      next: response => {
        if (this.selectedIncident()?.id !== incident.id) return;
        this.incidentCharges.set(response.items ?? []);
        this.loadingCharges.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (this.selectedIncident()?.id !== incident.id) return;
        this.loadingCharges.set(false);
        this.error.set(this.apiError(err, 'No fue posible consultar los cargos.'));
      }
    });
  }

  incidentTypeLabel(type: string): string {
    return ({ damaged: 'Dañado', lost: 'Perdido', missing: 'Faltante' } as Record<string, string>)[type] ?? type;
  }

  confirmReconciliation(): void {
    const incident = this.selectedIncident();
    if (!incident || this.reconciling() || !this.canReconcile()) return;
    if (incident.status !== 'reported' && incident.status !== 'assessed') return;

    const rawCost = String(this.reconciliationCost ?? '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(rawCost) || Number(rawCost) > 9999999999.99) {
      this.error.set('Ingresa un costo válido con máximo dos decimales.');
      return;
    }
    if (!window.confirm(`¿Confirmar conciliación de la incidencia #${incident.id}?`)) return;

    this.deficitConfirmation.set(null);
    this.submitReconciliation(incident.id, rawCost, false);
  }

  private submitReconciliation(
    incidentId: number,
    unitCost: string,
    acceptDeficit: boolean
  ): void {
    if (this.reconciling() || !this.canReconcile()) return;

    this.reconciling.set(true);
    this.error.set('');
    this.success.set('');
    this.http.post<ReconciliationResponse>(
      `/api/v1/inventory/incidents/${incidentId}/reconcile`,
      { unit_cost: unitCost, accept_deficit: acceptDeficit }
    ).subscribe({
      next: response => {
        this.reconciling.set(false);
        this.deficitConfirmation.set(null);
        this.success.set(
          (response.capacity?.shortage_quantity ?? 0) > 0
            ? 'Conciliación registrada. Existe un déficit de inventario pendiente de resolver.'
            : 'Conciliación registrada correctamente.'
        );
        this.selectedIncident.set(null);
        this.incidentCharges.set([]);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.reconciling.set(false);
        const code: string | undefined = err.error?.error;
        if (err.status === 409 && code === 'inventory_capacity_conflict' && !acceptDeficit) {
          this.deficitConfirmation.set({ incidentId, unitCost });
          return;
        }
        const messages: Record<string, string> = {
          loss_exceeds_outstanding: 'La pérdida supera las unidades pendientes.',
          damage_exceeds_returned:
  'No existen suficientes unidades devueltas disponibles para conciliar este daño. Verifica las devoluciones en Inventario → Operaciones.',
          inventory_capacity_deficit_open: 'Existen compromisos de inventario sin existencias suficientes.',
          incident_already_adjusted: 'Esta incidencia ya fue conciliada.',
          invalid_unit_cost: 'El costo unitario no es válido.',
          inventory_capacity_conflict: 'La conciliación generaría un déficit de inventario.',
          incident_not_reconcilable: 'Esta incidencia ya no puede conciliarse.'
        };
        this.error.set((code && messages[code]) || code || 'No fue posible conciliar.');
      }
    });
  }

  acceptInventoryDeficit(): void {
    const pending = this.deficitConfirmation();
    if (!pending || this.reconciling() || !this.canReconcile()) return;
    if (this.selectedIncident()?.id !== pending.incidentId) {
      this.deficitConfirmation.set(null);
      return;
    }
    this.deficitConfirmation.set(null);
    this.submitReconciliation(pending.incidentId, pending.unitCost, true);
  }

  cancelInventoryDeficit(): void {
    if (!this.reconciling()) this.deficitConfirmation.set(null);
  }

  deficitUnitCost(): number {
    return Number(this.deficitConfirmation()?.unitCost ?? 0);
  }

  private apiError(err: HttpErrorResponse, fallback: string): string {
    const code = err.error?.error;
    return typeof code === 'string' && code ? code : fallback;
  }
}
