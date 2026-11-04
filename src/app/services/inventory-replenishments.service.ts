
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// INTERFACES - INVENTARIO
// ============================================

export interface InventoryItemOption {
  id: number;
  name: string;
  sku: string;
  quantity_total: number;
  quantity_unavailable: number;
  is_active?: boolean;
}

// ============================================
// INTERFACES - REPOSICIONES
// ============================================

export interface Replenishment {
  id: number;
  tenant_id: number;
  inventory_item_id: number;
  quantity: number;
  reason: string;
  reference: string | null;
  created_by: number;
  created_at: string;
}

export interface CreateReplenishmentPayload {
  quantity: number;
  reason: string;
  reference?: string | null;
}

// ============================================
// INTERFACES - CAPACIDAD
// ============================================

export interface AffectedReservation {
  reservation_id: number;
  required_quantity: number;
  available_quantity: number;
  shortage_quantity: number;
}

export interface Capacity {
  inventory_item_id: number;
  quantity_total: number;
  quantity_unavailable: number;
  quantity_usable: number;
  max_reserved: number;
  shortage_quantity: number;
  affected_reservations: AffectedReservation[];
  audit_events_created?: number;
}

export interface ReplenishmentResponse {
  replenishment: Replenishment;
  previous_quantity_total: number;
  new_quantity_total: number;
  capacity: Capacity;
}

// ============================================
// INTERFACES - ALERTAS
// ============================================

export interface CapacityAlert {
  id: number;
  tenant_id: number;
  inventory_item_id: number;
  reservation_id: number;
  required_quantity: number;
  available_quantity: number;
  shortage_quantity: number;
  status: 'open' | 'resolved';
  detected_at: string;
  resolved_at: string | null;
}

// ============================================
// INTERFACES - AUDITORÍA
// ============================================

export type CapacityAlertAction =
  | 'opened'
  | 'updated'
  | 'resolved'
  | 'reopened';

export interface CapacityAlertEvent {
  id: number;
  tenant_id: number;
  alert_id: number;
  action: CapacityAlertAction;
  previous_shortage: number;
  new_shortage: number;
  source_type: string;
  source_id: number | null;
  created_by: number | null;
  created_at: string;
}

// ============================================
// RESPUESTAS PAGINADAS
// ============================================

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export type ListResponse<T> =
  | PagedResponse<T>
  | T[];

// ============================================
// SERVICIO HTTP
// ============================================

@Injectable({
  providedIn: 'root'
})
export class InventoryReplenishmentsService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/v1/inventory';

  // ============================================
  // ARTÍCULOS
  // ============================================

  getItems(): Observable<ListResponse<InventoryItemOption>> {
    return this.http.get<ListResponse<InventoryItemOption>>(
      `${this.baseUrl}/items`
    );
  }

  // ============================================
  // REGISTRAR REPOSICIÓN
  // ============================================

  create(
    itemId: number,
    payload: CreateReplenishmentPayload
  ): Observable<ReplenishmentResponse> {

    return this.http.post<ReplenishmentResponse>(
      `${this.baseUrl}/items/${itemId}/replenishments`,
      payload
    );
  }

  // ============================================
  // HISTORIAL DE REPOSICIONES
  // ============================================

  list(
    itemId: number,
    page = 1,
    perPage = 20
  ): Observable<PagedResponse<Replenishment>> {

    const params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    return this.http.get<PagedResponse<Replenishment>>(
      `${this.baseUrl}/items/${itemId}/replenishments`,
      { params }
    );
  }

  // ============================================
  // ALERTAS DE CAPACIDAD
  // ============================================

  getCapacityAlerts(): Observable<ListResponse<CapacityAlert>> {

    return this.http.get<ListResponse<CapacityAlert>>(
      `${this.baseUrl}/capacity-alerts`
    );
  }

  // ============================================
  // AUDITORÍA DE ALERTAS
  // ============================================

  getAlertHistory(
    alertId: number,
    page = 1,
    perPage = 20
  ): Observable<PagedResponse<CapacityAlertEvent>> {

    const params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    return this.http.get<PagedResponse<CapacityAlertEvent>>(
      `${this.baseUrl}/capacity-alerts/${alertId}/events`,
      { params }
    );
  }
}
