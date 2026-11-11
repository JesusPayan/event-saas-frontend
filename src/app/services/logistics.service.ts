import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import {
  CreateLogisticsOrder,
  LogisticsOrder,
  LogisticsStatus
} from '../models/logistics.model';

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private http = inject(HttpClient);
  private api = '/api/v1/logistics/orders';

  list(filters?: {
    event_id?: number;
    status?: LogisticsStatus;
  }) {
    let params = new HttpParams();

    if (filters?.event_id) {
      params = params.set('event_id', filters.event_id);
    }

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<LogisticsOrder[]>(
      this.api, { params }
    );
  }

  get(id: number) {
    return this.http.get<LogisticsOrder>(
      `${this.api}/${id}`
    );
  }

  create(payload: CreateLogisticsOrder) {
    return this.http.post<LogisticsOrder>(
      this.api, payload
    );
  }

  prepareItem(
    orderId: number,
    itemId: number,
    quantity: number
  ) {
    return this.http.patch<LogisticsOrder>(
      `${this.api}/${orderId}/items/${itemId}`,
      { quantity_prepared: quantity }
    );
  }

  changeStatus(
    orderId: number,
    status: LogisticsStatus
  ) {
    return this.http.patch<LogisticsOrder>(
      `${this.api}/${orderId}/status`,
      { status }
    );
  }
}