
import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventsService } from '../../../services/events.service';
import { Event, EventStatus } from '../../../models/event.model';
import { AuthService } from '../../../services/auth.service';
import { EventInventoryReservationsComponent }
  from './event-inventory-reservations/event-inventory-reservations.component';

const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['quoted', 'cancelled'],
  quoted: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Borrador',
  quoted: 'Cotizado',
  confirmed: 'Confirmado',
  in_progress: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado'
};

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    EventInventoryReservationsComponent
  ],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css'
})


// @Component({
//   selector: 'app-event-detail',
//   standalone: true,
//   imports: [
//     DatePipe, 
//     RouterLink,
//     EventInventoryReservationsComponent
// ],
//   template: `
//     <section class="event-detail">
//       <a routerLink="/events">← Volver a eventos</a>

//       @if (loading()) {
//         <p>Cargando evento...</p>
//       }

//       @if (error()) {
//         <p class="error" role="alert">{{ error() }}</p>
//       }

//       @if (event(); as e) {
//         <header>
//           <h1>{{ e.name }}</h1>
//           <p>Estado: <strong>{{ statusLabel(e.status) }}</strong></p>
//         </header>

//         <div class="detail-grid">
//           <article>
//             <h2>Información general</h2>

//             <dl>
//               <dt>Tipo</dt>
//               <dd>{{ e.event_type }}</dd>

//               <dt>Cliente</dt>
//               <dd>
//                 <a [routerLink]="['/clients', e.client_id]">
//                   Ver cliente #{{ e.client_id }}
//                 </a>
//               </dd>

//               <dt>Ubicación</dt>
//               <dd>{{ e.location || 'Sin ubicación' }}</dd>

//               <dt>Invitados estimados</dt>
//               <dd>{{ e.estimated_guests ?? 'Sin definir' }}</dd>

//               <dt>Descripción</dt>
//               <dd>{{ e.description || 'Sin descripción' }}</dd>
//             </dl>
//           </article>

//           <article>
//             <h2>Programación</h2>

//             <dl>
//               <dt>Inicio</dt>
//               <dd>{{ e.starts_at | date:'dd/MM/yyyy HH:mm' }}</dd>

//               <dt>Finalización</dt>
//               <dd>{{ e.ends_at | date:'dd/MM/yyyy HH:mm' }}</dd>

//               <dt>Creado</dt>
//               <dd>{{ e.created_at | date:'dd/MM/yyyy HH:mm' }}</dd>
//             </dl>
//           </article>
//         </div>

//         @if (auth.hasPermission('events.update')) {
//           <section>
//             <h2>Administrar evento</h2>

//             @if (e.status !== 'completed' && e.status !== 'cancelled') {
//               <a [routerLink]="['/events', e.id, 'edit']">
//                 Editar evento
//               </a>
//             }

//             @if (availableStatuses(e.status).length > 0) {
//               <h3>Cambiar estado</h3>

//               <div class="status-actions">
//                 @for (status of availableStatuses(e.status); track status) {
//                   <button
//                     type="button"
//                     [disabled]="saving()"
//                     (click)="changeStatus(status)">
//                     {{ statusLabel(status) }}
//                   </button>
//                 }
//               </div>
//             }
//           </section>
//         }
//       }
//  @if (event(); as e) {
//   @if (auth.hasPermission('inventory.read')) {
//     <app-event-inventory-reservations
//       [eventId]="e.id"
//       [startsAt]="e.starts_at"
//       [endsAt]="e.ends_at"
//       [eventStatus]="e.status">
//     </app-event-inventory-reservations>
//   }
// }
//     </section>
   


//   `,
//   
// })
export class EventDetailComponent implements OnInit {
  private readonly service = inject(EventsService);
  private readonly route = inject(ActivatedRoute);

  readonly auth = inject(AuthService);
  readonly event = signal<Event | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  private eventId = 0;

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isSafeInteger(this.eventId) || this.eventId <= 0) {
      this.error.set('Identificador de evento inválido.');
      return;
    }

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.getById(this.eventId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: event => this.event.set(event),
        error: err => {
          this.error.set(
            err.status === 404
              ? 'Evento no encontrado.'
              : 'No se pudo cargar el evento.'
          );
        }
      });
  }

  statusLabel(status: EventStatus): string {
    return STATUS_LABELS[status];
  }

  availableStatuses(status: EventStatus): EventStatus[] {
    return TRANSITIONS[status];
  }

  changeStatus(status: EventStatus): void {
    const current = this.event();

    if (!current || this.saving()) return;
    if (!this.auth.hasPermission('events.update')) return;
    if (!TRANSITIONS[current.status].includes(status)) return;

    if (!window.confirm(
      `¿Cambiar el estado a "${this.statusLabel(status)}"?`
    )) return;

    this.saving.set(true);
    this.error.set('');

    this.service.changeStatus(current.id, status)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: updated => this.event.set(updated),
        error: err => {
          this.error.set(
            err.status === 409
              ? 'La transición de estado no está permitida.'
              : 'No se pudo actualizar el estado.'
          );
        }
      });
  }
}
