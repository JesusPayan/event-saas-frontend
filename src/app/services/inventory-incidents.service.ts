
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryIncident {
  id: number;
  reservation_id: number;
  inventory_item_id: number;
  incident_type: 'damaged' | 'lost' | 'missing';
  quantity: number;
  description: string;
  status: string;
  unit_cost?: string | null;
  total_cost?: string | null;
}

export interface IncidentCharge {
  id: number;
  incident_id: number;
  event_id: number;
  amount: string;
  currency: string;
  status: string;
}

export interface IncidentList<T> {
  items: T[];
}

@Injectable({
  providedIn: 'root'
})
export class InventoryIncidentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/inventory/incidents';

  list(): Observable<IncidentList<InventoryIncident>> {
    return this.http.get<IncidentList<InventoryIncident>>(
      this.baseUrl
    );
  }

  create(data: {
    reservation_id: number;
    incident_type: string;
    quantity: number;
    description: string;
  }): Observable<InventoryIncident> {
    return this.http.post<InventoryIncident>(
      this.baseUrl,
      data
    );
  }

  reconcile(
    incidentId: number,
    unitCost: string
  ): Observable<unknown> {
    return this.http.post(
      `${this.baseUrl}/${incidentId}/reconcile`,
      {
        unit_cost: unitCost
      }
    );
  }

  getCharges(
    incidentId: number
  ): Observable<IncidentList<IncidentCharge>> {
    return this.http.get<IncidentList<IncidentCharge>>(
      `${this.baseUrl}/${incidentId}/charges`
    );
  }
}
