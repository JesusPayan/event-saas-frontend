import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import {
  InventoryReportsService, MovementReportRow, MovementReportSummary,
} from '../services/inventory-reports.service';

/**
 * Resumen de inventario (recuperado de master, INV-49-06): entregas, devoluciones
 * y unidades pendientes, más el historial reciente de movimientos.
 * Usa el mismo endpoint que «Reportes de inventario» (/inventory/reports/movements).
 */
@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, PageHeaderComponent],
  templateUrl: './inventory-dashboard.component.html',
})
export class InventoryDashboardComponent {
  private readonly reports = inject(InventoryReportsService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly summary = signal<MovementReportSummary>({ quantity_dispatched: 0, quantity_returned: 0, quantity_outstanding: 0 });
  readonly movements = signal<MovementReportRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly movementType = signal<'' | 'dispatch' | 'return'>('');
  private readonly perPage = 10;

  constructor() {
    this.load();
  }

  setType(type: '' | 'dispatch' | 'return'): void {
    this.movementType.set(type);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  label(type: string): string {
    return type === 'dispatch' ? 'Entrega' : type === 'return' ? 'Devolución' : type;
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const type = this.movementType();
    forkJoin({
      global: this.reports.getMovements({}, 1, 1),
      history: this.reports.getMovements(type ? { movement_type: type } : {}, this.page(), this.perPage),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ global, history }) => {
        if (global.summary) this.summary.set(global.summary);
        this.movements.set(history.items);
        this.total.set(history.total);
        this.pages.set(history.pages);
      },
      error: () => this.error.set('No fue posible consultar el resumen de inventario.'),
    });
  }
}
