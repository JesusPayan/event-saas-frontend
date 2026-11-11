
export type LogisticsStatus =
  | 'pending'
  | 'in_progress'
  | 'prepared'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export interface LogisticsOrderItem {
  id: number;
  inventory_item_id: number;
  quantity_required: number;
  quantity_prepared: number;
}

export interface LogisticsOrder {
  id: number;
  tenant_id: number;
  event_id: number;
  status: LogisticsStatus;

  scheduled_at: string | null;
  notes: string | null;

  created_by: number;
  created_at: string;
  updated_at: string;

  dispatched_at: string | null;
  dispatched_by: number | null;
  dispatch_notes: string | null;

  delivered_at: string | null;
  delivered_by: number | null;
  delivery_notes: string | null;

  items: LogisticsOrderItem[];
}

export interface CreateLogisticsOrder {
  event_id: number;
  scheduled_at?: string | null;
  notes?: string | null;
}

export interface LogisticsStatusHistory {
  id: number;
  logistics_order_id: number;
  previous_status: LogisticsStatus | null;
  new_status: LogisticsStatus;
  changed_by: number;
  notes: string | null;
  created_at: string;
}
