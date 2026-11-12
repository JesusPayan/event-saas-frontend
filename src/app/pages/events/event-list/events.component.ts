
import { Component, OnInit, inject, signal,computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventsService } from '../../../services/events.service';
import { Event, EventsPage } from '../../../models/event.model';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './events.component.html'
})
export class EventsComponent implements OnInit {
  private readonly service = inject(EventsService);

  readonly events = signal<Event[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
readonly draftCount = computed(() =>
  this.events().filter(event => event.status === 'draft').length
);

readonly cancelledCount = computed(() =>
  this.events().filter(event => event.status === 'cancelled').length
);

statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    quoted: 'Cotizado',
    confirmed: 'Confirmado',
    in_progress: 'En progreso',
    completed: 'Completado',
    cancelled: 'Cancelado'
  };

  return labels[status] ?? status;
}
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
