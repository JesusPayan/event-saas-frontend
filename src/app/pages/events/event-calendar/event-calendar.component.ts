
import {
  Component, OnInit, inject, signal, computed
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventsService } from '../../../services/events.service';
import { Event, EventStatus } from '../../../models/event.model';
import { AuthService } from '../../../services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Borrador',
  quoted: 'Cotizado',
  confirmed: 'Confirmado',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const STATUS_CLASSES: Record<EventStatus, string> = {
  draft: 'bg-gray-100 !text-gray-700',
  quoted: 'bg-amber-100 !text-amber-800',
  confirmed: 'bg-blue-100 !text-blue-800',
  in_progress: 'bg-purple-100 !text-purple-800',
  completed: 'bg-green-100 !text-green-800',
  cancelled: 'bg-red-100 !text-red-800',
};

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  isToday: boolean;
  events: Event[];
}

@Component({
  selector: 'app-event-calendar',
  standalone: true,
  imports: [RouterLink, DatePipe, TitleCasePipe, PageHeaderComponent],
  templateUrl: './event-calendar.component.html',
})
export class EventCalendarComponent implements OnInit {
  private readonly service = inject(EventsService);
  readonly auth = inject(AuthService);

  readonly currentDate = signal(new Date());
  readonly events = signal<Event[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const selected = this.currentDate();
    const year = selected.getFullYear();
    const month = selected.getMonth();

    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;

    const gridStart = new Date(year, month, 1 - offset);
    const days: CalendarDay[] = [];
    const now = new Date();
    const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    for (let i = 0; i < 42; i++) {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i
      );

      const dayStart = date.getTime();
      const dayEnd = new Date(
        date.getFullYear(), date.getMonth(), date.getDate() + 1
      ).getTime();

      days.push({
        date,
        currentMonth: date.getMonth() === month,
        isToday: date.getTime() === todayKey,
        events: this.events().filter(event => {
          const start = new Date(event.starts_at).getTime();
          const end = new Date(event.ends_at).getTime();

          return start < dayEnd && end > dayStart;
        })
      });
    }

    return days;
  });

  readonly isCurrentMonth = computed(() => {
    const d = this.currentDate();
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  statusLabel(status: EventStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusClass(status: EventStatus): string {
    return STATUS_CLASSES[status] ?? STATUS_CLASSES.draft;
  }

  ngOnInit(): void {
    this.load();
  }

  previousMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.load();
  }

  nextMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.load();
  }

  today(): void {
    this.currentDate.set(new Date());
    this.load();
  }

  load(): void {
    const selected = this.currentDate();
    const year = selected.getFullYear();
    const month = selected.getMonth();

    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - offset);
    const gridEnd = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + 42
    );

    this.loading.set(true);
    this.error.set('');
    this.events.set([]);

    // Se requiere el endpoint /events/calendar definido
    // en la siguiente sección del backend.
    this.service.calendar(
      gridStart.toISOString(),
      gridEnd.toISOString()
    )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: events => this.events.set(events),
        error: err => {
          console.error(err);
          this.error.set('No se pudo cargar el calendario.');
        }
      });
  }
}
