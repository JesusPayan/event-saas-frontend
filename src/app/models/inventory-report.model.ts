
export type InventoryMovementType = 'dispatch' | 'return';

export interface InventoryMovementReportItem {
  movement_id: number;
  reservation_id: number;
  inventory_item_id: number;
  event_id: number;

  sku: string;
  item_name: string;

  movement_type: InventoryMovementType;
  quantity: number;

  notes: string | null;
  created_by: number;
  created_at: string;
}

export interface InventoryMovementReportSummary {
  quantity_dispatched: number;
  quantity_returned: number;
  quantity_outstanding: number;
}

export interface InventoryMovementReportResponse {
  items: InventoryMovementReportItem[];

  total: number;
  page: number;
  per_page: number;
  pages: number;

  summary: InventoryMovementReportSummary;
}

export interface InventoryMovementReportFilters {
  date_from?: string;
  date_to?: string;
  event_id?: number;
  item_id?: number;
  movement_type?: InventoryMovementType;
  page?: number;
  per_page?: number;
}

// Contrato de disponibilidad.
// Ajustaremos los campos al JSON real de INV-49-04.
export interface InventoryAvailabilityReportResponse {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface InventoryAvailabilityReportFilters {
  date_from?: string;
  date_to?: string;
  item_id?: number;
  page?: number;
  per_page?: number;
}
