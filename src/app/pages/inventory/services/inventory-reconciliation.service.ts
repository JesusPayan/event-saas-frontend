import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReconciliationPayload {
  accept_deficit: boolean;
  unit_cost?: string;
}

export interface ReconciliationResponse {
  incident: Record<string, unknown>;
  adjustment: Record<string, unknown>;
  charge: Record<string, unknown>;
  inventory: Record<string, unknown>;
  audit: Record<string, unknown>;
  capacity: {
    quantity_total: number;
    quantity_unavailable: number;
    quantity_usable: number;
    max_reserved: number;
    shortage_quantity: number;
    affected_reservations: unknown[];
    audit_events_created: number;
  };
  quantity_unresolved: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryReconciliationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/inventory';

  getIncident(id: number): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(
      `${this.baseUrl}/incidents/${id}`
    );
  }

  reconcile(
    incidentId: number,
    payload: ReconciliationPayload
  ): Observable<ReconciliationResponse> {
    return this.http.post<ReconciliationResponse>(
      `${this.baseUrl}/incidents/${incidentId}/reconcile`,
      payload
    );
  }

  getCapacityAlerts(itemId?: number): Observable<unknown> {
    let params = new HttpParams();

    if (itemId !== undefined) {
      params = params.set('item_id', String(itemId));
    }

    return this.http.get(
      `${this.baseUrl}/capacity-alerts`,
      { params }
    );
  }

  getReconciliationAudits(itemId?: number): Observable<unknown> {
    let params = new HttpParams();

    if (itemId !== undefined) {
      params = params.set('item_id', String(itemId));
    }

    return this.http.get(
      `${this.baseUrl}/reconciliation-audits`,
      { params }
    );
  }
}