
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Event,
  EventPayload,
  EventsPage,
  EventStatus
} from '../models/event.model';

export interface EventFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  client_id?: number;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/v1/events';

  list(filters: EventFilters = {}): Observable<EventsPage> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('per_page', filters.per_page ?? 20);

    if (filters.search) {
      params = params.set('search', filters.search.trim());
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.client_id) {
      params = params.set('client_id', filters.client_id);
    }

    if (filters.from) {
      params = params.set('from', filters.from);
    }

    if (filters.to) {
      params = params.set('to', filters.to);
    }

    return this.http.get<EventsPage>(this.url, { params });
  }

  getById(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.url}/${id}`);
  }

  create(payload: EventPayload): Observable<Event> {
    return this.http.post<Event>(this.url, payload);
  }

  update(id: number, payload: Partial<EventPayload>): Observable<Event> {
    return this.http.patch<Event>(`${this.url}/${id}`, payload);
  }

  changeStatus(id: number, status: EventStatus): Observable<Event> {
    return this.http.patch<Event>(
      `${this.url}/${id}/status`,
      { status }
    );
  }
  calendar(from: string, to: string): Observable<Event[]> {
  const params = new HttpParams()
    .set('from', from)
    .set('to', to);

  return this.http.get<Event[]>(
    `${this.url}/calendar`,
    { params }
  );
}
}
