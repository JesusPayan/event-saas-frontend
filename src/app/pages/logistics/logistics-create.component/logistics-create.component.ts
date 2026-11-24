
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { LogisticsService } from '../../../services/logistics.service';
import { EventsService } from '../../../services/events.service';
import { Event } from '../../../models/event.model';

@Component({
  selector: 'app-logistics-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './logistics-create.component.html'
})
export class LogisticsCreateComponent implements OnInit {

  private readonly logistics = inject(LogisticsService);
  private readonly eventsService = inject(EventsService);
  private readonly router = inject(Router);

  // ==========================================
  // ESTADO DE EVENTOS
  // ==========================================

  readonly events = signal<Event[]>([]);
  readonly selectedEvent = signal<Event | null>(null);
  readonly eventId = signal<number | null>(null);

  // ==========================================
  // FORMULARIO
  // ==========================================

  scheduledAt = '';
  notes = '';

  // ==========================================
  // ESTADOS DE CARGA
  // ==========================================

  readonly loadingEvents = signal(false);
  readonly loadingEvent = signal(false);
  readonly saving = signal(false);

  // ==========================================
  // MENSAJES
  // ==========================================

  readonly error = signal('');
  readonly eventError = signal('');

  // ==========================================
  // VALIDACIÓN
  // ==========================================

  readonly canCreate = computed(() => {
    const event = this.selectedEvent();

    return (
      event !== null &&
      event.id === this.eventId() &&
      !this.loadingEvents() &&
      !this.loadingEvent() &&
      !this.saving()
    );
  });

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  ngOnInit(): void {
    this.loadEvents();
  }

  // ==========================================
  // CARGAR EVENTOS
  // ==========================================

  loadEvents(): void {
    this.loadingEvents.set(true);
    this.eventError.set('');

    this.eventsService.list({
      page: 1,
      per_page: 50
    }).subscribe({
      next: response => {
        const availableEvents = response.items.filter(
          event =>
            event.status !== 'cancelled' &&
            event.status !== 'completed'
        );

        this.events.set(availableEvents);
        this.loadingEvents.set(false);

        console.log(
          '[LOGISTICS CREATE] Eventos disponibles:',
          availableEvents.length
        );
      },
      error: (err: HttpErrorResponse) => {
        console.error(
          '[LOGISTICS CREATE] Error cargando eventos:',
          err
        );

        this.eventError.set(
          err.error?.message ||
          'No se pudieron cargar los eventos.'
        );

        this.loadingEvents.set(false);
      }
    });
  }

  // ==========================================
  // SELECCIONAR EVENTO
  // ==========================================

  onEventChange(value: number | null): void {
    const id = value === null ? null : Number(value);

    this.eventId.set(id);
    this.selectedEvent.set(null);

    this.eventError.set('');
    this.error.set('');

    if (id !== null) {
      this.searchEvent(id);
    } else {
      this.loadingEvent.set(false);
    }
  }

  // ==========================================
  // CONSULTAR EVENTO
  // ==========================================

  searchEvent(id: number): void {

    if (!Number.isInteger(id) || id <= 0) {
      this.eventError.set('Selecciona un evento válido.');
      return;
    }

    this.loadingEvent.set(true);
    this.eventError.set('');

    this.eventsService.getById(id).subscribe({
      next: event => {

        // Evitar mostrar un evento anterior
        // cuando el usuario cambia de selección.
        if (this.eventId() !== id) {
          return;
        }

        if (
          event.status === 'cancelled' ||
          event.status === 'completed'
        ) {
          this.selectedEvent.set(null);

          this.eventError.set(
            'No se pueden preparar eventos cancelados o completados.'
          );
        } else {
          this.selectedEvent.set(event);
        }

        this.loadingEvent.set(false);
      },
      error: (err: HttpErrorResponse) => {

        if (this.eventId() !== id) {
          return;
        }

        this.selectedEvent.set(null);

        this.eventError.set(
          err.error?.message ||
          'No se pudo consultar el evento.'
        );

        this.loadingEvent.set(false);
      }
    });
  }

  // ==========================================
  // CREAR ORDEN LOGÍSTICA
  // ==========================================

  save(): void {

    const event = this.selectedEvent();

    if (!this.canCreate() || !event) {
      this.error.set('Selecciona un evento válido.');
      return;
    }

    let scheduledAt: string | null = null;

    // Convertir fecha local a UTC para Flask
    if (this.scheduledAt) {
      const date = new Date(this.scheduledAt);

      if (Number.isNaN(date.getTime())) {
        this.error.set('Fecha de preparación inválida.');
        return;
      }

      scheduledAt = date.toISOString();
    }

    this.saving.set(true);
    this.error.set('');

    this.logistics.create({
      event_id: event.id,
      scheduled_at: scheduledAt,
      notes: this.notes.trim() || null
    }).subscribe({
      next: order => {
        this.saving.set(false);

        console.log(
          '[LOGISTICS CREATE] Orden creada:',
          order
        );

        this.router.navigate([
          '/logistics',
          order.id
        ]);
      },
      error: (err: HttpErrorResponse) => {

        console.error(
          '[LOGISTICS CREATE] Error creando orden:',
          err
        );

        this.error.set(
          err.error?.message ||
          'No se pudo crear la orden logística.'
        );

        this.saving.set(false);
      }
    });
  }
}
