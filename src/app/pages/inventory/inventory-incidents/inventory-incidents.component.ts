import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  InventoryIncidentsService,
  InventoryIncident,
  IncidentCharge
} from '../../../services/inventory-incidents.service';

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

interface InventoryItemOption { id: number; name: string; sku?: string }
interface PagedResponse<T> { items: T[] }

@Component({
  selector: 'app-inventory-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventory-incidents.component.html',
  styleUrl: './inventory-incidents.component.css'
})
export class InventoryIncidentsComponent implements OnInit {
  private readonly service = inject(InventoryIncidentsService);
  private readonly http = inject(HttpClient);

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
    this.error.set('');
    this.service.list().subscribe({
      next: response => this.incidents.set(response.items ?? []),
      error: err => this.error.set(err.error?.error || 'Error al consultar incidencias.')
    });
  }

  loadEvents(): void {
    this.loadingEvents.set(true);
    this.http.get<PagedResponse<EventOption>>('/api/v1/events', {
      params: { page: 1, per_page: 100 }
    }).subscribe({
      next: response => {
        this.events.set(response.items ?? []);
        this.loadingEvents.set(false);
      },
      error: err => {
        this.loadingEvents.set(false);
        this.error.set(err.error?.error || 'No fue posible consultar los eventos.');
      }
    });
  }

  loadInventoryNames(): void {
    this.http.get<PagedResponse<InventoryItemOption>>('/api/v1/inventory/items', {
      params: { page: 1, per_page: 100 }
    }).subscribe({
      next: response => {
        const names: Record<number, string> = {};
        for (const item of response.items ?? []) {
          names[item.id] = item.sku ? `${item.name} (${item.sku})` : item.name;
        }
        this.inventoryNames.set(names);
      }
      // Optional enrichment: failure does not block incident registration.
    });
  }

//   onEventChange(): void {
//     this.reservationId = null;
//     this.eventReservations.set([]);
//     const eventId = this.selectedEventId;
//     if (!eventId) {
//       this.loadingReservations.set(false);
//       return;
//     }
//     this.loadingReservations.set(true);
//     this.http.get<PagedResponse<ReservationOption>>(
//       `/api/v1/events/${eventId}/reservations`
//     ).subscribe({
//       next: response => {
//   console.log('Reservaciones recibidas:', response);

//   const reservations = response.items ?? [];

//   console.log('Reservaciones antes del filtro:', reservations);

//   const active = reservations.filter(
//     reservation => reservation.status === 'reserved'
//   );

//   console.log('Reservaciones activas:', active);

//   this.eventReservations.set(active);
//   this.loadingReservations.set(false);
// },
//       error: err => {
//         if (this.selectedEventId !== eventId) return;
//         this.loadingReservations.set(false);
//         this.error.set(err.error?.error || 'No fue posible consultar las reservaciones.');
//       }
//     });
//   }

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

  this.http.get<
    ReservationOption[] |
    PagedResponse<ReservationOption>
  >(`/api/v1/events/${eventId}/reservations`)
    .subscribe({
      next: (response) => {
        // Evitar que una respuesta anterior sobrescriba
        // las reservaciones del evento seleccionado.
        if (this.selectedEventId !== eventId) {
          return;
        }

        console.log('Reservaciones recibidas:', response);

        // Compatible con respuesta tipo arreglo
        // y con respuesta paginada { items: [...] }.
        const reservations = Array.isArray(response)
          ? response
          : response.items ?? [];

        const active = reservations.filter(
          reservation =>
            reservation.status === 'reserved' &&
            reservation.event_id === eventId
        );

        console.log('Reservaciones activas:', active);

        this.eventReservations.set(active);
        this.loadingReservations.set(false);
      },

      error: (err) => {
        if (this.selectedEventId !== eventId) {
          return;
        }

        this.loadingReservations.set(false);

        this.error.set(
          err.error?.error ||
          'No fue posible consultar las reservaciones.'
        );
      }
    });
}


  eventLabel(event: EventOption): string {
    return `${event.name || event.title || event.event_name || `Evento #${event.id}`} (#${event.id})`;
  }

  reservationLabel(reservation: ReservationOption): string {
    const name = reservation.inventory_item?.name || reservation.item?.name ||
      reservation.inventory_item_name || reservation.item_name ||
      this.inventoryNames()[reservation.inventory_item_id] ||
      `Artículo #${reservation.inventory_item_id}`;
    return `${name} — ${reservation.quantity} unidades (reserva #${reservation.id})`;
  }

  create(): void {
    if (!this.selectedEventId || !Number.isInteger(this.reservationId) ||
        !this.eventReservations().some(r => r.id === this.reservationId) ||
        !Number.isInteger(this.quantity) || this.quantity <= 0 ||
        !this.description.trim()) {
      this.error.set('Selecciona un evento, una reservación válida y completa los datos.');
      return;
    }
    const reservation = this.eventReservations().find(
  r => r.id === this.reservationId
);

if (reservation && this.quantity > reservation.quantity) {
  this.error.set(
    `La cantidad no puede superar las ` +
    `${reservation.quantity} unidades reservadas.`
  );
  return;
}
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.service.create({
      reservation_id: this.reservationId!,
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
      error: err => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Error al registrar incidencia.');
      }
    });
  }

  openReconciliation(incident: InventoryIncident): void {
    this.selectedIncident.set(incident);
    this.reconciliationCost = incident.unit_cost ?? '';
    this.incidentCharges.set([]);
    this.error.set('');
    this.success.set('');
  }

  closeReconciliation(): void {
    if (this.reconciling()) return;
    this.selectedIncident.set(null);
    this.incidentCharges.set([]);
  }

  get estimatedReconciliationTotal(): number {
    return Number(this.reconciliationCost || 0) * (this.selectedIncident()?.quantity ?? 0);
  }

  viewIncidentCharges(incident: InventoryIncident): void {
    this.selectedIncident.set(incident);
    this.incidentCharges.set([]);
    this.loadingCharges.set(true);
    this.error.set('');
    this.service.getCharges(incident.id).subscribe({
      next: response => {
        this.incidentCharges.set(response.items ?? []);
        this.loadingCharges.set(false);
      },
      error: err => {
        this.loadingCharges.set(false);
        this.error.set(err.error?.error || 'No fue posible consultar los cargos.');
      }
    });
  }

  incidentTypeLabel(type: string): string {
    return ({ damaged: 'Dañado', lost: 'Perdido', missing: 'Faltante' } as Record<string, string>)[type] ?? type;
  }

  confirmReconciliation(): void {
    const incident = this.selectedIncident();
    if (!incident || this.reconciling()) return;
    const rawCost = String(this.reconciliationCost ?? '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(rawCost) || Number(rawCost) > 9999999999.99) {
      this.error.set('Ingresa un costo válido con máximo dos decimales.');
      return;
    }
    if (!window.confirm(`¿Confirmar conciliación de la incidencia #${incident.id}?`)) return;
    this.submitReconciliation(incident.id, rawCost, false);
  }

  private submitReconciliation(incidentId: number, unitCost: string, acceptDeficit: boolean): void {
    this.reconciling.set(true);
    this.error.set('');
    this.http.post<any>(`/api/v1/inventory/incidents/${incidentId}/reconcile`, {
      unit_cost: unitCost,
      accept_deficit: acceptDeficit
    }).subscribe({
      next: response => {
        this.reconciling.set(false);
        this.success.set(
          response.capacity?.shortage_quantity > 0
            ? 'Conciliación registrada. Existe un déficit de inventario pendiente de resolver.'
            : 'Conciliación registrada correctamente.'
        );
        this.load();
        this.selectedIncident.set(null);
      },
      error: err => {
        this.reconciling.set(false);
        const code = err.error?.error;
        if (err.status === 409 && code === 'inventory_capacity_conflict' && !acceptDeficit) {
          const confirmed = window.confirm(
            'ATENCIÓN: esta conciliación dejará inventario insuficiente para uno o más eventos.\n\n' +
            'Se registrará una alerta persistente y se bloquearán nuevas asignaciones del artículo hasta resolver el déficit.\n\n' +
            '¿Deseas registrar la pérdida de todas formas?'
          );
          if (confirmed) this.submitReconciliation(incidentId, unitCost, true);
          return;
        }
        const messages: Record<string, string> = {
          loss_exceeds_outstanding: 'La pérdida supera las unidades pendientes.',
          damage_exceeds_returned: 'El daño supera las unidades devueltas.',
          inventory_capacity_deficit_open: 'Existen compromisos de inventario sin existencias suficientes.',
          incident_already_adjusted: 'Esta incidencia ya fue conciliada.',
          invalid_unit_cost: 'El costo unitario no es válido.'
        };
        this.error.set(messages[code] || code || 'No fue posible conciliar.');
      }
    });
  }
}
