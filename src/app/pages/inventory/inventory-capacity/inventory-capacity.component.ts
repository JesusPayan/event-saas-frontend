
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  InventoryCapacityService,
  CapacityAlert,
  ReconciliationAudit
} from '../../../services/inventory-capacity.service';

@Component({
  selector: 'app-inventory-capacity',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inventory-capacity.component.html'
})
export class InventoryCapacityComponent implements OnInit {

  private readonly service = inject(InventoryCapacityService);

  readonly alerts = signal<CapacityAlert[]>([]);
  readonly audits = signal<ReconciliationAudit[]>([]);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly openAlerts = computed(() =>
    this.alerts().filter(alert => alert.status === 'open')
  );

  readonly resolvedCount = computed(() =>
    this.alerts().filter(alert => alert.status === 'resolved').length
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    forkJoin({
      alerts: this.service.getAlerts(),
      audits: this.service.getAudits()
    }).subscribe({
      next: response => {
        this.alerts.set(response.alerts.items ?? []);
        this.audits.set(response.audits.items ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(
          err.error?.error ||
          'No fue posible consultar el control de inventario.'
        );
      }
    });
  }

  amount(
    value: string | number | null | undefined
  ): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  readonly statusFilter = signal<'all' | 'open' | 'resolved'>('all');
readonly itemFilter = signal<number | null>(null);

readonly filteredAlerts = computed(() =>
  this.alerts().filter(alert => {
    const matchesStatus =
      this.statusFilter() === 'all' ||
      alert.status === this.statusFilter();

    const matchesItem =
      this.itemFilter() === null ||
      alert.inventory_item_id === this.itemFilter();

    return matchesStatus && matchesItem;
  })
);

readonly itemIds = computed(() =>
  [...new Set(this.alerts().map(a => a.inventory_item_id))]
    .sort((a, b) => a - b)
);
}
