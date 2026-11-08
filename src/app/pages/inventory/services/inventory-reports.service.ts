
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import {
  InventoryMovementReportFilters,
  InventoryMovementReportResponse,
  InventoryAvailabilityReportFilters,
  InventoryAvailabilityReportResponse
} 
// from 'app/models/inventory-reports.model';
from '../../../models/inventory-report.model';
@Injectable({
  providedIn: 'root'
})
export class InventoryReportsService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/v1/inventory/reports';

  getMovements(
    filters: InventoryMovementReportFilters = {}
  ): Observable<InventoryMovementReportResponse> {

    return this.http.get<InventoryMovementReportResponse>(
      `${this.apiUrl}/movements`,
      {
        params: this.buildParams(filters)
      }
    );
  }

  getAvailability(
    filters: InventoryAvailabilityReportFilters = {}
  ): Observable<InventoryAvailabilityReportResponse> {

    return this.http.get<InventoryAvailabilityReportResponse>(
      `${this.apiUrl}/availability`,
      {
        params: this.buildParams(filters)
      }
    );
  }

  private buildParams<T extends object>(
  filters: T
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
}
