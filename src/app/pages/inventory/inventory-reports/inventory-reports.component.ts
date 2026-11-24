
import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import {
  Component,
  OnDestroy,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../services/auth.service';

import {
  InventoryReportsService,
  MovementReportFilters,
  AvailabilityReportFilters,
  MovementReportRow,
  AvailabilityReportRow,
  ExportFormat
} from '../services/inventory-reports.service';

type ReportType = 'movements' | 'availability';

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-reports.component.html'
})
export class InventoryReportsComponent implements OnDestroy {

  private readonly reports = inject(InventoryReportsService);
  readonly auth = inject(AuthService);
  readonly hasSearched = signal(false);
  private request?: Subscription;
  private downloadRequest?: Subscription;

  // ==========================================
  // ESTADOS
  // ==========================================
changeType(type: ReportType): void {
  this.request?.unsubscribe();

  this.reportType = type;
  this.page = 1;

  this.total.set(0);
  this.movements.set([]);
  this.availability.set([]);

  this.loading.set(false);
  this.error.set('');
  this.hasSearched.set(false);
}
  readonly loading = signal(false);
  readonly downloading = signal(false);
  readonly error = signal('');

  readonly movements = signal<MovementReportRow[]>([]);
  readonly availability = signal<AvailabilityReportRow[]>([]);

  readonly total = signal(0);

  reportType: ReportType = 'movements';

  page = 1;
  readonly perPage = 25;

  // ==========================================
  // FILTROS DE MOVIMIENTOS
  // ==========================================

  dateFrom = '';
  dateTo = '';

  eventId: number | null = null;
  itemId: number | null = null;

  movementType = '';

  // ==========================================
  // FILTROS DE DISPONIBILIDAD
  // ==========================================

  startsAt = '';
  endsAt = '';

  categoryId: number | null = null;
  search = '';

  // ==========================================
  // PERMISOS Y PAGINACIÓN
  // ==========================================

  get canRead(): boolean {
    return this.auth.hasPermission('inventory.read');
  }

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.total() / this.perPage)
    );
  }

  // ==========================================
  // INDICADORES DE DISPONIBILIDAD
  // ==========================================

  get totalDeficitItems(): number {
    return this.availability().filter(
      item => Number(item.inventory_shortage ?? 0) > 0
    ).length;
  }

  get totalUnavailableUnits(): number {
    return this.availability().reduce(
      (total, item) =>
        total + Number(item.quantity_unavailable ?? 0),
      0
    );
  }

  get totalShortageUnits(): number {
    return this.availability().reduce(
      (total, item) =>
        total + Number(item.inventory_shortage ?? 0),
      0
    );
  }

  // ==========================================
  // CONVERSIÓN DE FECHAS
  // ==========================================

  private toISODate(value: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error('invalid_date');
    }

    return date.toISOString();
  }

  // ==========================================
  // FILTROS PARA API
  // ==========================================

  private movementFilters(): MovementReportFilters {
    return {
      date_from: this.toISODate(this.dateFrom),
      date_to: this.toISODate(this.dateTo),
      event_id: this.eventId,
      item_id: this.itemId,
      movement_type: this.movementType || undefined
    };
  }

  private availabilityFilters(): AvailabilityReportFilters {
    return {
      starts_at: this.toISODate(this.startsAt)!,
      ends_at: this.toISODate(this.endsAt)!,
      category_id: this.categoryId,
      item_id: this.itemId,
      search: this.search
    };
  }

  // ==========================================
  // VALIDACIÓN DE FILTROS
  // ==========================================

  private validFilters(): boolean {

    if (this.reportType === 'movements') {

      const from = this.dateFrom
        ? Date.parse(this.dateFrom)
        : null;

      const to = this.dateTo
        ? Date.parse(this.dateTo)
        : null;

      if (
        (from !== null && !Number.isFinite(from)) ||
        (to !== null && !Number.isFinite(to))
      ) {
        this.error.set(
          'Las fechas del reporte no son válidas.'
        );
        return false;
      }

      if (
        from !== null &&
        to !== null &&
        to < from
      ) {
        this.error.set(
          'La fecha final no puede ser anterior a la inicial.'
        );
        return false;
      }
    }

    if (this.reportType === 'availability') {

      if (!this.startsAt || !this.endsAt) {
        this.error.set(
          'Selecciona las fechas de disponibilidad.'
        );
        return false;
      }

      const start = Date.parse(this.startsAt);
      const end = Date.parse(this.endsAt);

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end <= start
      ) {
        this.error.set(
          'Selecciona un rango de disponibilidad válido.'
        );
        return false;
      }
    }

    return true;
  }

  // ==========================================
  // CAMBIAR TIPO DE REPORTE
  // ==========================================


  // ==========================================
  // CONSULTAR REPORTE
  // ==========================================

  searchReport(resetPage = true): void {

    if (!this.canRead) {
      this.error.set(
        'No tienes permiso para consultar reportes.'
      );
      return;
    }

    this.error.set('');

    if (!this.validFilters()) {
      return;
    }

    if (resetPage) {
      this.page = 1;
    }

    this.request?.unsubscribe();
    this.hasSearched.set(false);
    this.loading.set(true);

    const onError = (err: HttpErrorResponse) => {

      this.loading.set(false);

      this.total.set(0);
      this.movements.set([]);
      this.availability.set([]);
      this.hasSearched.set(false);

      if (err.status === 403) {
        this.error.set(
          'No tienes permiso para consultar este reporte.'
        );
      } else if (err.status === 400) {
        this.error.set(
          'Los filtros enviados no son válidos.'
        );
      } else if (err.status === 401) {
        this.error.set(
          'Tu sesión ha expirado. Inicia sesión nuevamente.'
        );
      } else {
        this.error.set(
          'No fue posible consultar el reporte.'
        );
      }
    };

    if (this.reportType === 'movements') {

      this.request = this.reports.getMovements(
        this.movementFilters(),
        this.page,
        this.perPage
      ).subscribe({

        next: result => {
          this.movements.set(result.items ?? []);
          this.total.set(result.total ?? 0);
          this.hasSearched.set(true);
          this.loading.set(false);
        },

        error: onError
      });

    } else {

      this.request = this.reports.getAvailability(
        this.availabilityFilters(),
        this.page,
        this.perPage
      ).subscribe({

        next: result => {
          this.availability.set(result.items ?? []);
          this.total.set(result.total ?? 0);
          this.hasSearched.set(true);
          this.loading.set(false);
        },

        error: onError
      });
    }
  }

  // ==========================================
  // PAGINACIÓN
  // ==========================================

  changePage(nextPage: number): void {

    if (
      nextPage < 1 ||
      nextPage > this.totalPages ||
      this.loading()
    ) {
      return;
    }

    this.page = nextPage;

    this.searchReport(false);
  }

  // ==========================================
  // EXPORTAR CSV / EXCEL
  // ==========================================

  download(format: ExportFormat): void {

    if (!this.canRead || this.downloading()) {
      return;
    }

    this.error.set('');

    if (!this.validFilters()) {
      return;
    }

    this.downloading.set(true);

    const request$ = this.reportType === 'movements'
      ? this.reports.exportMovements(
          this.movementFilters(),
          format
        )
      : this.reports.exportAvailability(
          this.availabilityFilters(),
          format
        );

    this.downloadRequest?.unsubscribe();

    this.downloadRequest = request$.subscribe({

      next: response => {

        try {
          this.saveFile(response, format);
        } catch {
          this.error.set(
            'No fue posible guardar el archivo.'
          );
        } finally {
          this.downloading.set(false);
        }
      },

      error: (err: HttpErrorResponse) => {

        this.downloading.set(false);

        if (err.status === 403) {
          this.error.set(
            'No tienes permiso para exportar este reporte.'
          );
        } else if (err.status === 401) {
          this.error.set(
            'Tu sesión ha expirado.'
          );
        } else {
          this.error.set(
            'No fue posible descargar el archivo.'
          );
        }
      }
    });
  }

  // ==========================================
  // GUARDAR ARCHIVO
  // ==========================================

  private saveFile(
    response: HttpResponse<Blob>,
    format: ExportFormat
  ): void {

    if (!response.body) {
      throw new Error('empty_export');
    }

    const name = this.reportType === 'movements'
      ? 'inventory_movements'
      : 'inventory_availability';

    const filename =
      `${name}_${new Date().toISOString().slice(0, 10)}.${format}`;

    const url = URL.createObjectURL(response.body);

    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // ==========================================
  // LIMPIEZA
  // ==========================================

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.downloadRequest?.unsubscribe();
  }
}
