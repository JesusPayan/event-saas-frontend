
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InventoryReportsService } from '../services/inventory-reports.service'
// '../../../services/inventory-reports.service';

import {
  InventoryMovementReportItem,
  InventoryMovementReportSummary,
  InventoryMovementType
} from '../../../models/inventory-report.model';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-dashboard.html',
})
export class InventoryDashboardComponent implements OnInit {

  private readonly reportsService = inject(InventoryReportsService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly movements = signal<InventoryMovementReportItem[]>([]);

  readonly summary = signal<InventoryMovementReportSummary>({
    quantity_dispatched: 0,
    quantity_returned: 0,
    quantity_outstanding: 0
  });

  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly perPage = 10;

  readonly movementType = signal<InventoryMovementType | ''>('');

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
  this.loading.set(true);
  this.error.set(null);

  const filters = {
    page: this.page(),
    per_page: this.perPage,
    ...(this.movementType()
      ? { movement_type: this.movementType() as InventoryMovementType }
      : {})
  };

  forkJoin({
    global: this.reportsService.getMovements({
      page: 1,
      per_page: 1
    }),
    history: this.reportsService.getMovements(filters)
  })
    .pipe(finalize(() => this.loading.set(false)))
    .subscribe({
      next: ({ global, history }) => {
        this.summary.set(global.summary);

        this.movements.set(history.items);
        this.total.set(history.total);
        this.pages.set(history.pages);
      },
      error: err => {
        console.error('Inventory dashboard error:', err);
        this.error.set(
          'No fue posible consultar los reportes de inventario.'
        );
      }
    });
}

  changeMovementType(value: string): void {
    this.movementType.set(value as InventoryMovementType | '');
    this.page.set(1);
    this.loadMovements();
  }

  nextPage(): void {
    if (this.page() < this.pages()) {
      this.page.update(value => value + 1);
      this.loadMovements();
    }
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update(value => value - 1);
      this.loadMovements();
    }
  }

  movementLabel(type: InventoryMovementType): string {
    return type === 'dispatch' ? 'Entrega' : 'Devolución';
  }
}
