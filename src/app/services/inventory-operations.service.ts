
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  InventoryOperationsResponse,
  InventoryOperationsSummary,
  InventoryOperationsFilters
} from '../models/inventory-operation.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryOperationsService {

  private readonly http = inject(HttpClient);

  private readonly api =
    '/api/v1/inventory/operations';

  private buildParams(
    filters: InventoryOperationsFilters = {}
  ): HttpParams {
    let params = new HttpParams();

    if (filters.from) {
      params = params.set('from', filters.from);
    }

    if (filters.to) {
      params = params.set('to', filters.to);
    }

    if (filters.event_id != null) {
      params = params.set('event_id', filters.event_id);
    }

    if (filters.item_id != null) {
      params = params.set('item_id', filters.item_id);
    }

    if (filters.page != null) {
      params = params.set('page', filters.page);
    }

    if (filters.per_page != null) {
      params = params.set('per_page', filters.per_page);
    }

    return params;
  }

  getCalendar(
    filters: InventoryOperationsFilters = {}
  ): Observable<InventoryOperationsResponse> {
    return this.http.get<InventoryOperationsResponse>(
      `${this.api}/calendar`,
      { params: this.buildParams(filters) }
    );
  }

  getPendingDispatches(
    filters: InventoryOperationsFilters = {}
  ): Observable<InventoryOperationsResponse> {
    return this.http.get<InventoryOperationsResponse>(
      `${this.api}/pending-dispatches`,
      { params: this.buildParams(filters) }
    );
  }

  getPendingReturns(
    filters: InventoryOperationsFilters = {},
    overdueOnly = false
  ): Observable<InventoryOperationsResponse> {
    const params = this.buildParams(filters)
      .set('overdue', String(overdueOnly));

    return this.http.get<InventoryOperationsResponse>(
      `${this.api}/pending-returns`,
      { params }
    );
  }

  getSummary(
    filters: Pick<
      InventoryOperationsFilters,
      'from' | 'to'
    > = {}
  ): Observable<InventoryOperationsSummary> {
    return this.http.get<InventoryOperationsSummary>(
      `${this.api}/summary`,
      { params: this.buildParams(filters) }
    );
  }
}
