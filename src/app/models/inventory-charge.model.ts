
export type ChargeStatus =
  | 'pending'
  | 'approved'
  | 'waived'
  | 'paid';

export interface InventoryCharge {
  id: number;
  tenant_id: number;
  incident_id: number;
  event_id: number;
  amount: string;
  currency: string;
  status: ChargeStatus;
  description: string | null;
  created_by: number;
  created_at: string;
  approved_by?: number | null;
  approved_at?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  payment_method?: string | null;
  waived_by?: number | null;
  waived_at?: string | null;
  resolution_notes?: string | null;
}

export interface ChargeAudit {
  id: number;
  tenant_id: number;
  charge_id: number;
  previous_status: ChargeStatus;
  new_status: ChargeStatus;
  notes: string | null;
  changed_by: number;
  created_at: string;
}

export interface ApiList<T> {
  items: T[];
}

export interface ChargeActionPayload {
  notes?: string;
  payment_reference?: string;
  payment_method?: 'cash' | 'transfer' | 'card' | 'other';
}
