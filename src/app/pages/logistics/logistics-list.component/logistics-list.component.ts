
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { LogisticsService } from '../../../services/logistics.service';
import { EventsService } from '../../../services/events.service';
import { LogisticsOrder } from '../../../models/logistics.model';

@Component({
  selector: 'app-logistics-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './logistics-list.component.html'
})
export class LogisticsListComponent implements OnInit {

  private readonly logistics = inject(LogisticsService);
  private readonly eventsService = inject(EventsService);

  // Órdenes logísticas
  readonly orders = signal<LogisticsOrder[]>([]);

  // Diccionario: ID del evento -> nombre
  readonly eventNames = signal<Record<number, string>>({});

  // Estados de la pantalla
  readonly loading = signal(false);
  readonly loadingEventNames = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  // ==========================================
  // CARGAR ÓRDENES
  // ==========================================

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.logistics.list().subscribe({
      next: (orders: LogisticsOrder[]) => {
        this.orders.set(orders);
        this.loading.set(false);

        // Consultar nombres después de cargar órdenes
        this.loadEventNames(orders);
      },
      error: (err: HttpErrorResponse) => {
        console.error(
          '[LOGISTICS LIST] Error cargando órdenes:',
          err
        );

        this.error.set(
          err.error?.message ||
          'No se pudieron cargar las órdenes.'
        );

        this.loading.set(false);
      }
    });
  }

  // ==========================================
  // CONSULTAR NOMBRES DE EVENTOS
  // ==========================================

  loadEventNames(orders: LogisticsOrder[]): void {

    // Obtener IDs únicos
    const eventIds = [
      ...new Set(orders.map(order => order.event_id))
    ];

    // Evitar consultas innecesarias
    const missingIds = eventIds.filter(
      id => !this.eventNames()[id]
    );

    if (missingIds.length === 0) {
      this.loadingEventNames.set(false);
      return;
    }

    this.loadingEventNames.set(true);

    // Una petición por cada evento diferente
    const requests = missingIds.map(id =>
      this.eventsService.getById(id).pipe(
        map(event => ({
          id,
          name: event.name
        })),
        catchError(err => {
          console.warn(
            `[LOGISTICS LIST] No se pudo consultar evento ${id}`,
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
        console.error(
          '[LOGISTICS LIST] Error consultando nombres:',
          err
        );

        this.loadingEventNames.set(false);
      }
    });
  }

  // ==========================================
  // OBTENER NOMBRE DEL EVENTO
  // ==========================================

  eventName(eventId: number): string {
    return this.eventNames()[eventId] || `Evento #${eventId}`;
  }

  // ==========================================
  // PROGRESO
  // ==========================================

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
      ? Math.round((prepared / required) * 100)
      : 0;
  }

  // ==========================================
  // ETIQUETAS DE ESTADO
  // ==========================================

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      in_progress: 'En preparación',
      prepared: 'Preparada',
      cancelled: 'Cancelada'
    };

    return labels[status] || status;
  }
}
