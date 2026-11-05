
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

export interface ReconciliationAudit {
  id: number;
  incident_id: number;
  inventory_item_id: number;
  adjustment_type: string;
  quantity: number;
  quantity_total_before: number;
  quantity_total_after: number;
  unavailable_before: number;
  unavailable_after: number;
  capacity_before: number;
  capacity_after: number;
  max_reserved: number;
  shortage_after: number;
  unit_cost: string;
  total_cost: string;
  accepted_deficit: boolean;
  reason: string | null;
  created_by: number;
  created_at: string;
}

export interface ItemCapacity {
  inventory_item_id: number;
  quantity_total: number;
  quantity_unavailable: number;
  quantity_usable: number;
  max_reserved: number;
  shortage_quantity: number;
}


@Injectable({ providedIn: 'root' })
export class InventoryCapacityService {

  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/inventory';

  getAlerts() {
    return this.http.get<{ items: CapacityAlert[] }>(
      `${this.base}/capacity-alerts`
    );
  }

  getAudits() {
    return this.http.get<{ items: ReconciliationAudit[] }>(
      `${this.base}/reconciliation-audits`
    );
  }

  getCapacity(itemId: number) {
    return this.http.get<ItemCapacity>(
      `${this.base}/items/${itemId}/capacity`
    );
  }
}
