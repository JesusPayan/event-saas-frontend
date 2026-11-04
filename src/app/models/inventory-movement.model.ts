
export type InventoryMovementType =
  | 'dispatch'
  | 'return';

export interface InventoryMovement {
  id: number;
  tenant_id: number;
  inventory_item_id: number;
  reservation_id: number;
  movement_type: InventoryMovementType;
  quantity: number;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export interface InventoryMovementSummary {
  quantity_dispatched: number;
  quantity_returned: number;
  quantity_outstanding: number;
}

export interface InventoryMovementsResponse {
  items: InventoryMovement[];
  summary: InventoryMovementSummary;
}

export interface InventoryMovementRequest {
  reservation_id: number;
  quantity: number;
  notes?: string;
}

export interface InventoryMovementResult {
  movement: InventoryMovement;
  summary: InventoryMovementSummary;
}


export interface InventoryMovement {
  id: number;
  tenant_id: number;
  inventory_item_id: number;
  reservation_id: number;
  movement_type: 'dispatch' | 'return';
  quantity: number;
  notes: string | null;
  created_by: number|null;
  created_at: string;
}

export interface MovementSummary {
  quantity_dispatched: number;
  quantity_returned: number;
  quantity_outstanding: number;
}

export interface InventoryMovementRequest {
  reservation_id: number;
  quantity: number;
  notes?: string;
}

export interface InventoryMovementsResponse {
  items: InventoryMovement[];
  summary: MovementSummary;
}

export interface InventoryMovementResult {
  movement: InventoryMovement;
  summary: MovementSummary;
}
