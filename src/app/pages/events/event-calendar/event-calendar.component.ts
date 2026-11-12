
import {
  Component, OnInit, inject, signal, computed
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventsService } from '../../../services/events.service';
import { Event } from '../../../models/event.model';

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  events: Event[];
}

@Component({
  selector: 'app-event-calendar',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './event-calendar.component.html',
  styles: [`
    .calendar-page { padding: 24px; max-width: 1400px; margin: auto; }
    header, .calendar-toolbar {
      display: flex; justify-content: space-between;
      align-items: center; gap: 16px; flex-wrap: wrap;
      margin-bottom: 20px;
    }
    nav { display: flex; gap: 14px; }
    .calendar-grid {
      display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
      border-top: 1px solid #ddd; border-left: 1px solid #ddd;
    }
    .weekday {
      text-align: center; font-weight: 600;
      padding: 12px 4px; border-right: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
    }
    .calendar-day {
      min-height: 115px; padding: 7px;
      border-right: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
      overflow: hidden;
    }
    .other-month { opacity: .4; background: #8881; }
    .day-number { font-size: 13px; font-weight: 600; }
    .calendar-event {
      display: block; margin-top: 5px; padding: 5px;
      border-radius: 5px; background: #dbeafe;
      color: #1e40af; text-decoration: none;
      font-size: 12px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .cancelled { background: #fee2e2; color: #991b1b; }
    .error { color: #b42318; }
    @media(max-width: 650px) {
      .calendar-day { min-height: 75px; padding: 3px; }
      .calendar-event { font-size: 10px; padding: 3px; }
    }
  `]
})
export class EventCalendarComponent implements OnInit {
  private readonly service = inject(EventsService);

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
        events: this.events().filter(event => {
          const start = new Date(event.starts_at).getTime();
          const end = new Date(event.ends_at).getTime();

          return start < dayEnd && end > dayStart;
        })
      });
    }

    return days;
  });

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
