
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  quantity_total: number;
  is_active: boolean;
}

export interface InventoryItemsResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface InventoryAvailability {
  inventory_item_id: number;
  sku: string;
  name: string;
  quantity_total: number;
  quantity_reserved: number;
  quantity_available: number;
  is_active?: boolean;
}

export interface InventoryReservation {
  id: number;
  tenant_id?: number;
  event_id: number;
  inventory_item_id: number;
  quantity: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryReservationsService {

  private readonly http = inject(HttpClient);
  private readonly api = '/api/v1';

  /**
   * Obtiene el catálogo de artículos.
   */
  getItems(
    page = 1,
    perPage = 100
  ): Observable<InventoryItemsResponse> {

    const params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage));

    return this.http.get<InventoryItemsResponse>(
      `${this.api}/inventory/items`,
      { params }
    );
  }

  /**
   * Consulta disponibilidad para el periodo del evento.
   */
  getAvailability(
    itemId: number,
    startsAt: string,
    endsAt: string
  ): Observable<InventoryAvailability> {

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      throw new Error(
        'Las fechas del evento no son válidas.'
      );
    }

    if (endDate <= startDate) {
      throw new Error(
        'La fecha de finalización debe ser posterior al inicio.'
      );
    }

    const params = new HttpParams()
      .set('item_id', String(itemId))
      .set('starts_at', startDate.toISOString())
      .set('ends_at', endDate.toISOString());

    return this.http.get<InventoryAvailability>(
      `${this.api}/inventory/availability`,
      { params }
    );
  }

  /**
   * Obtiene las reservaciones del evento.
   */
  getReservations(
    eventId: number
  ): Observable<InventoryReservation[]> {

    return this.http.get<InventoryReservation[]>(
      `${this.api}/events/${eventId}/reservations`
    );
  }

  /**
   * Crea o actualiza una reservación,
   * según el comportamiento del backend.
   */
  saveReservation(
    eventId: number,
    itemId: number,
    quantity: number
  ): Observable<InventoryReservation> {

    return this.http.post<InventoryReservation>(
      `${this.api}/events/${eventId}/reservations`,
      {
        inventory_item_id: itemId,
        quantity
      }
    );
  }

  /**
   * Cancela una reservación existente.
   */
  cancelReservation(
    eventId: number,
    reservationId: number
  ): Observable<InventoryReservation> {

    return this.http.patch<InventoryReservation>(
      `${this.api}/events/${eventId}/reservations/${reservationId}/cancel`,
      {}
    );
  }
}
