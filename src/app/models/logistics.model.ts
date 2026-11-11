export type LogisticsStatus =
  | 'pending'
  | 'in_progress'
  | 'prepared'
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
  items: LogisticsOrderItem[];
}

export interface CreateLogisticsOrder {
  event_id: number;
  scheduled_at?: string | null;
  notes?: string | null;
}