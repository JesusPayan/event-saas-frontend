
export interface InventoryOperation {
  reservation_id: number;
  event_id: number;
  inventory_item_id: number;

  item_name: string;
  item_sku: string;

  event_status: string;
  reservation_status: string;

  starts_at: string;
  ends_at: string;

  quantity_reserved: number;
  quantity_dispatched: number;
  quantity_returned: number;
  quantity_pending_dispatch: number;
  quantity_outstanding: number;

  is_overdue: boolean;
}

export interface InventoryOperationsResponse {
  items: InventoryOperation[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface InventoryOperationsSummary {
  reservations: number;
  quantity_reserved: number;
  quantity_dispatched: number;
  quantity_returned: number;
  quantity_pending_dispatch: number;
  quantity_outstanding: number;
  overdue_reservations: number;
}

export interface InventoryOperationsFilters {
  from?: string;
  to?: string;
  event_id?: number;
  item_id?: number;
  page?: number;
  per_page?: number;
}
