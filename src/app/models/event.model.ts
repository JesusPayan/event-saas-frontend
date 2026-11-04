
export type EventStatus =
  | 'draft'
  | 'quoted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Event {
  id: number;
  tenant_id: number;
  client_id: number;
  name: string;
  event_type: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  status: EventStatus;
  estimated_guests: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventPayload {
  client_id: number;
  name: string;
  event_type: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  estimated_guests?: number | null;
}

export interface EventsPage {
  items: Event[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
