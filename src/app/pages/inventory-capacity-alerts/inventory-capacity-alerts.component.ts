
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed
} from '@angular/core';

import { Subject, takeUntil } from 'rxjs';

import {
  InventoryReplenishmentsService,
  CapacityAlert,
  CapacityAlertEvent
} from '../../services/inventory-replenishments.service';

type AlertFilter = 'all' | 'open' | 'resolved';

@Component({
  selector: 'app-inventory-capacity-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-capacity-alerts.component.html'
})
export class InventoryCapacityAlertsComponent
  implements OnInit, OnDestroy {

  private readonly service = inject(
    InventoryReplenishmentsService
  );

  private readonly destroy$ = new Subject<void>();

  // ============================================
  // ESTADO GENERAL
  // ============================================

  readonly alerts = signal<CapacityAlert[]>([]);
  readonly events = signal<CapacityAlertEvent[]>([]);

  readonly selectedAlert = signal<CapacityAlert | null>(null);

  readonly loading = signal(false);
  readonly loadingEvents = signal(false);

  readonly error = signal('');
  readonly historyError = signal('');

  // ============================================
  // FILTROS
  // ============================================

  readonly statusFilter = signal<AlertFilter>('all');

  readonly filteredAlerts = computed(() => {
    const filter = this.statusFilter();

    if (filter === 'all') {
      return this.alerts();
    }

    return this.alerts().filter(
      alert => alert.status === filter
    );
  });

  // ============================================
  // INDICADORES
  // ============================================

  readonly totalAlerts = computed(
    () => this.alerts().length
  );

  readonly openAlerts = computed(
    () => this.alerts().filter(
      alert => alert.status === 'open'
    ).length
  );

  readonly resolvedAlerts = computed(
    () => this.alerts().filter(
      alert => alert.status === 'resolved'
    ).length
  );

  readonly totalShortage = computed(
    () => this.alerts()
      .filter(alert => alert.status === 'open')
      .reduce(
        (total, alert) => total + alert.shortage_quantity,
        0
      )
  );

  // ============================================
  // PAGINACIÓN DE AUDITORÍA
  // ============================================

  readonly historyPage = signal(1);
  readonly historyTotalPages = signal(0);
  readonly historyTotalRecords = signal(0);

  // ============================================
  // CONTROL DE SOLICITUDES
  // ============================================

  private alertsRequestId = 0;
  private historyRequestId = 0;

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  ngOnInit(): void {
    this.loadAlerts();
  }

  ngOnDestroy(): void {
    this.alertsRequestId++;
    this.historyRequestId++;

    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // CARGAR ALERTAS
  // ============================================

  loadAlerts(): void {
    const requestId = ++this.alertsRequestId;

    this.loading.set(true);
    this.error.set('');

    this.service.getCapacityAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (requestId !== this.alertsRequestId) {
            return;
          }

          const alerts = Array.isArray(response)
            ? response
            : response.items ?? [];

          this.alerts.set(alerts);
          this.loading.set(false);

          const selected = this.selectedAlert();

          if (selected) {
            const updated = alerts.find(
              alert => alert.id === selected.id
            );

            if (updated) {
              this.selectedAlert.set(updated);
            } else {
              this.closeHistory();
            }
          }
        },

        error: err => {
          if (requestId !== this.alertsRequestId) {
            return;
          }

          console.error(
            'Error cargando alertas de capacidad:',
            err
          );

          this.error.set(
            'No fue posible consultar las alertas de capacidad.'
          );

          this.loading.set(false);
        }
      });
  }

  // ============================================
  // CAMBIAR FILTRO
  // ============================================

  setFilter(filter: AlertFilter): void {
    this.statusFilter.set(filter);
  }

  // ============================================
  // CONSULTAR AUDITORÍA
  // ============================================

  viewHistory(alert: CapacityAlert): void {
    this.selectedAlert.set(alert);

    this.events.set([]);
    this.historyPage.set(1);
    this.historyTotalPages.set(0);
    this.historyTotalRecords.set(0);

    this.historyError.set('');

    this.loadHistory(1);
  }

  loadHistory(page = 1): void {
    const alert = this.selectedAlert();

    if (!alert) {
      return;
    }

    const alertId = alert.id;
    const requestId = ++this.historyRequestId;

    this.loadingEvents.set(true);
    this.historyError.set('');

    this.service.getAlertHistory(alertId, page)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (
            requestId !== this.historyRequestId ||
            this.selectedAlert()?.id !== alertId
          ) {
            return;
          }

          this.events.set(response.items ?? []);

          this.historyPage.set(response.page);
          this.historyTotalPages.set(response.pages);
          this.historyTotalRecords.set(response.total);

          this.loadingEvents.set(false);
        },

        error: err => {
          if (
            requestId !== this.historyRequestId ||
            this.selectedAlert()?.id !== alertId
          ) {
            return;
          }

          console.error(
            'Error consultando auditoría:',
            err
          );

          this.historyError.set(
            'No fue posible consultar el historial de auditoría.'
          );

          this.loadingEvents.set(false);
        }
      });
  }

  // ============================================
  // CERRAR AUDITORÍA
  // ============================================

  closeHistory(): void {
    this.historyRequestId++;

    this.selectedAlert.set(null);
    this.events.set([]);

    this.historyPage.set(1);
    this.historyTotalPages.set(0);
    this.historyTotalRecords.set(0);

    this.loadingEvents.set(false);
    this.historyError.set('');
  }

  // ============================================
  // PAGINACIÓN
  // ============================================

  nextHistoryPage(): void {
    if (
      !this.loadingEvents() &&
      this.historyPage() < this.historyTotalPages()
    ) {
      this.loadHistory(this.historyPage() + 1);
    }
  }

  previousHistoryPage(): void {
    if (
      !this.loadingEvents() &&
      this.historyPage() > 1
    ) {
      this.loadHistory(this.historyPage() - 1);
    }
  }

  // ============================================
  // ETIQUETAS
  // ============================================

  actionLabel(action: string): string {
    const labels: Record<string, string> = {
      opened: 'Apertura',
      updated: 'Actualización',
      resolved: 'Resolución',
      reopened: 'Reapertura'
    };

    return labels[action] ?? action;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Abierta',
      resolved: 'Resuelta'
    };

    return labels[status] ?? status;
  }

  sourceLabel(source: string): string {
    const labels: Record<string, string> = {
      system: 'Sistema',
      replenishment: 'Reposición',
      reservation: 'Reservación',
      incident: 'Incidencia',
      inventory_movement: 'Movimiento'
    };

    return labels[source] ?? source;
  }

  // ============================================
  // ESTILOS DE ESTADO
  // ============================================

  statusClass(status: string): string {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700';

      case 'resolved':
        return 'bg-green-100 text-green-700';

      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  actionClass(action: string): string {
    switch (action) {
      case 'opened':
        return 'bg-red-100 text-red-700';

      case 'updated':
        return 'bg-amber-100 text-amber-700';

      case 'resolved':
        return 'bg-green-100 text-green-700';

      case 'reopened':
        return 'bg-orange-100 text-orange-700';

      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  formatQuantity(quantity: number): string {
    return new Intl.NumberFormat('es-MX').format(quantity);
  }

  clearError(): void {
    this.error.set('');
    this.historyError.set('');
  }
}
