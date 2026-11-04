import {
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';

import {
  InventoryOperation,
  InventoryOperationsSummary
} from '../../../models/inventory-operation.model';

import {
  InventoryOperationsService
} from '../../../services/inventory-operations.service';

import {
  InventoryMovementManagerComponent
} from '../inventory-movement-manager/inventory-movement-manager.component';

import { AuthService } from '../../../services/auth.service';
type OperationTab =
  | 'calendar'
  | 'dispatches'
  | 'returns'
  | 'overdue';

interface CalendarDay {
  date: Date;
  key: string;
  day: number;
  currentMonth: boolean;
  operations: InventoryOperation[];
}

@Component({
  selector: 'app-inventory-operations',
  standalone: true,
  imports: [
    CommonModule,
    //FormsModule,
    RouterLink,
      InventoryMovementManagerComponent
  ],
  templateUrl:
    './inventory-operations.component.html',
  styleUrl:
    './inventory-operations.component.css'
})
export class InventoryOperationsComponent
  implements OnInit, OnDestroy  {

   private dataSubscription?: Subscription;
readonly selectedOperation =
  signal<InventoryOperation | null>(null);

  private readonly auth = inject(AuthService);

readonly canUpdateInventory = computed(() =>
  this.auth.permissions().includes('inventory.update')
);

openMovementManager(
  operation: InventoryOperation
): void {
  this.selectedOperation.set(operation);
}

closeMovementManager(): void {
  this.selectedOperation.set(null);
}

onMovementRegistered(): void {
  this.loadData();
}
ngOnDestroy(): void {
  this.dataSubscription?.unsubscribe();
}
  private readonly service =
    inject(InventoryOperationsService);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly activeTab =
    signal<OperationTab>('calendar');

  readonly currentDate = signal(
    new Date()
  );

  readonly selectedDate =
    signal<string | null>(null);

  readonly calendarOperations =
    signal<InventoryOperation[]>([]);

  readonly dispatches =
    signal<InventoryOperation[]>([]);

  readonly returns =
    signal<InventoryOperation[]>([]);

  readonly overdue =
    signal<InventoryOperation[]>([]);

  readonly summary =
    signal<InventoryOperationsSummary | null>(null);

  readonly monthLabel = computed(() => {
    return this.currentDate().toLocaleDateString(
      'es-MX',
      {
        month: 'long',
        year: 'numeric'
      }
    );
  });

  readonly calendarDays = computed(() => {
    const date = this.currentDate();

    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);

    // Lunes = primer día de la semana.
    const offset = (firstDay.getDay() + 6) % 7;

    const start = new Date(
      year,
      month,
      1 - offset
    );

    const operations = this.calendarOperations();

    const days: CalendarDay[] = [];

    for (let i = 0; i < 42; i++) {

      const day = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i
      );

      const key = this.dateKey(day);

      const dayOperations = operations.filter(op => {
        const startDate = new Date(op.starts_at);
        const endDate = new Date(op.ends_at);

        const dayStart = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate()
        );

        const dayEnd = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate() + 1
        );

        return (
          startDate < dayEnd &&
          endDate > dayStart
        );
      });

      days.push({
        date: day,
        key,
        day: day.getDate(),
        currentMonth:
          day.getMonth() === month,
        operations: dayOperations
      });
    }

    return days;
  });

  readonly selectedDayOperations = computed(() => {
    const key = this.selectedDate();

    if (!key) {
      return [];
    }

    return this.calendarDays()
      .find(day => day.key === key)
      ?.operations ?? [];
  });

  ngOnInit(): void {
    this.loadData();
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private monthRange(): {
    from: string;
    to: string;
  } {
    const date = this.currentDate();

    const year = date.getFullYear();
    const month = date.getMonth();

    const start = new Date(
      year,
      month,
      1
    );

    const end = new Date(
      year,
      month + 1,
      1
    );

    return {
      from: start.toISOString(),
      to: end.toISOString()
    };
  }

  
loadData(): void {

  // Cancelar consultas anteriores.
  this.dataSubscription?.unsubscribe();

  this.loading.set(true);
  this.error.set('');

  const range = this.monthRange();

  this.dataSubscription = forkJoin({

    calendar: this.service.getCalendar({
      ...range,
      page: 1,
      per_page: 100
    }),

    dispatches: this.service.getPendingDispatches({
      ...range,
      page: 1,
      per_page: 100
    }),

    returns: this.service.getPendingReturns({
      ...range,
      page: 1,
      per_page: 100
    }),

    overdue: this.service.getPendingReturns(
      {
        ...range,
        page: 1,
        per_page: 100
      },
      true
    ),

    summary: this.service.getSummary(range)

  }).subscribe({

    next: result => {

      this.calendarOperations.set(
        result.calendar.items
      );

      this.dispatches.set(
        result.dispatches.items
      );

      this.returns.set(
        result.returns.items
      );

      this.overdue.set(
        result.overdue.items
      );

      this.summary.set(
        result.summary
      );

      this.loading.set(false);
    },

    error: err => {

      console.error(
        'Error cargando operaciones:',
        err
      );

      if (err.status === 401) {
        this.error.set(
          'Tu sesión ha expirado. Inicia sesión nuevamente.'
        );
      } else if (err.status === 403) {
        this.error.set(
          'No tienes permisos para consultar operaciones.'
        );
      } else if (err.status === 404) {
        this.error.set(
          'No se encontraron los endpoints de operaciones. Verifica Flask.'
        );
      } else {
        this.error.set(
          'No fue posible cargar las operaciones de inventario.'
        );
      }

      this.loading.set(false);
    }
  });
}


  previousMonth(): void {
    const date = this.currentDate();

    this.currentDate.set(
      new Date(
        date.getFullYear(),
        date.getMonth() - 1,
        1
      )
    );

    this.selectedDate.set(null);
    this.selectedOperation.set(null);
    this.loadData();
  }

  nextMonth(): void {
    const date = this.currentDate();
    this.selectedOperation.set(null);

    this.currentDate.set(
      new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        1
      )
    );

    this.selectedDate.set(null);
    this.loadData();
  }

  selectDay(day: CalendarDay): void {
    this.selectedDate.set(day.key);
  }

  setTab(tab: OperationTab): void {
    this.activeTab.set(tab);
  }

  getActiveOperations(): InventoryOperation[] {
    switch (this.activeTab()) {
      case 'dispatches':
        return this.dispatches();

      case 'returns':
        return this.returns();

      case 'overdue':
        return this.overdue();

      default:
        return this.calendarOperations();
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      quoted: 'Cotizado',
      confirmed: 'Confirmado',
      in_progress: 'En progreso',
      completed: 'Finalizado',
      cancelled: 'Cancelado'
    };

    return labels[status] ?? status;
  }
}
