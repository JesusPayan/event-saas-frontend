
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';

export type ExportFormat = 'csv' | 'xlsx';

export interface MovementReportFilters {
  date_from?: string;
  date_to?: string;
  event_id?: number | null;
  item_id?: number | null;
  movement_type?: string;
}

export interface AvailabilityReportFilters {
  starts_at: string;
  ends_at: string;
  category_id?: number | null;
  item_id?: number | null;
  search?: string;
}

export interface PaginatedReport<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface MovementReportRow {
  movement_id: number;
  reservation_id: number;
  inventory_item_id: number;
  event_id: number;
  sku: string;
  item_name: string;
  movement_type: string;
  quantity: number;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export interface AvailabilityReportRow {
  inventory_item_id: number;
  category_id: number | null;
  sku: string;
  name: string;
  unit: string;
  is_active: boolean;
  quantity_total: number;
  quantity_unavailable: number;
  quantity_rentable: number;
  quantity_reserved: number;
  quantity_available: number;
  inventory_shortage: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/inventory/reports';

  private paramsFrom(
    filters: Record<string, unknown>
  ): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        params = params.set(key, String(value));
      }
    }

    return params;
  }

  getMovements(
    filters: MovementReportFilters,
    page = 1,
    perPage = 25
  ): Observable<PaginatedReport<MovementReportRow>> {
    return this.http.get<PaginatedReport<MovementReportRow>>(
      `${this.baseUrl}/movements`,
      {
        params: this.paramsFrom({
          ...filters,
          page,
          per_page: perPage
        })
      }
    );
  }

  getAvailability(
    filters: AvailabilityReportFilters,
    page = 1,
    perPage = 25
  ): Observable<PaginatedReport<AvailabilityReportRow>> {
    return this.http.get<PaginatedReport<AvailabilityReportRow>>(
      `${this.baseUrl}/availability`,
      {
        params: this.paramsFrom({
          ...filters,
          page,
          per_page: perPage
        })
      }
    );
  }

  exportMovements(
    filters: MovementReportFilters,
    format: ExportFormat
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.baseUrl}/movements/export${format === 'csv' ? '' : '.xlsx'}`,
      {
        params: this.paramsFrom({ ...filters }),
        observe: 'response',
        responseType: 'blob'
      }
    );
  }

  exportAvailability(
    filters: AvailabilityReportFilters,
    format: ExportFormat
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.baseUrl}/availability/export${format === 'csv' ? '' : '.xlsx'}`,
      {
        params: this.paramsFrom({ ...filters }),
        observe: 'response',
        responseType: 'blob'
      }
    );
  }
}
