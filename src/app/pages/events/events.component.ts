
import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventsService } from '../../services/events.service';
import { Event, EventsPage } from '../../models/event.model';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <main class="events-container">
      <header>
        <h1>Gestión de eventos</h1>
        <p>Administra los eventos de tu empresa.</p>

        <a routerLink="/events/new" class="btn-primary">
          + Nuevo evento
        </a>
        <a routerLink="/events/calendar">
            Ver calendario
        </a>
      </header>

      @if (loading()) {
        <p>Cargando eventos...</p>
      }

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (!loading() && !error()) {
        <table>
          <thead>
            <tr>
              <th>Evento</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Ubicación</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (event of events(); track event.id) {
              <tr>
                <td>
                  <a [routerLink]="['/events', event.id]">
                    {{ event.name }}
                  </a>
                </td>
                <td>{{ event.event_type }}</td>
                <td>{{ event.starts_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ event.location || 'Sin ubicación' }}</td>
                <td>{{ event.status }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">No hay eventos registrados.</td>
              </tr>
            }
          </tbody>
        </table>

        <p>Total de eventos: {{ total() }}</p>
      }
    </main>
  `
})
export class EventsComponent implements OnInit {
  private readonly service = inject(EventsService);

  readonly events = signal<Event[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: EventsPage) => {
          this.events.set(response.items);
          this.total.set(response.total);
        },
        error: err => {
          console.error(err);
          this.error.set('No se pudieron cargar los eventos.');
        }
      });
  }
}
