
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CreateLogisticsOrder,
  LogisticsOrder,
  LogisticsStatus,
  LogisticsStatusHistory
} from '../models/logistics.model';

@Injectable({
  providedIn: 'root'
})
export class LogisticsService {

  private readonly http = inject(HttpClient);

  private readonly api = '/api/v1/logistics/orders';

  list(filters?: {
    event_id?: number;
    status?: LogisticsStatus;
  }): Observable<LogisticsOrder[]> {

    let params = new HttpParams();

    if (filters?.event_id) {
      params = params.set('event_id', filters.event_id);
    }

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<LogisticsOrder[]>(
      this.api,
      { params }
    );
  }

  get(id: number): Observable<LogisticsOrder> {
    return this.http.get<LogisticsOrder>(
      `${this.api}/${id}`
    );
  }

  create(
    payload: CreateLogisticsOrder
  ): Observable<LogisticsOrder> {
    return this.http.post<LogisticsOrder>(
      this.api,
      payload
    );
  }

  prepareItem(
    orderId: number,
    itemId: number,
    quantity: number
  ): Observable<LogisticsOrder> {

    return this.http.patch<LogisticsOrder>(
      `${this.api}/${orderId}/items/${itemId}`,
      {
        quantity_prepared: quantity
      }
    );
  }

  changeStatus(
    orderId: number,
    status: LogisticsStatus
  ): Observable<LogisticsOrder> {

    return this.http.patch<LogisticsOrder>(
      `${this.api}/${orderId}/status`,
      { status }
    );
  }

  dispatch(
    orderId: number,
    notes: string | null = null
  ): Observable<LogisticsOrder> {

    return this.http.post<LogisticsOrder>(
      `${this.api}/${orderId}/dispatch`,
      { notes }
    );
  }

  deliver(
    orderId: number,
    notes: string | null = null
  ): Observable<LogisticsOrder> {

    return this.http.post<LogisticsOrder>(
      `${this.api}/${orderId}/deliver`,
      { notes }
    );
  }

  history(
    orderId: number
  ): Observable<LogisticsStatusHistory[]> {

    return this.http.get<LogisticsStatusHistory[]>(
      `${this.api}/${orderId}/history`
    );
  }
}
