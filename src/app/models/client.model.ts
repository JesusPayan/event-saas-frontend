
export type ClientType = 'individual' | 'business';
export type ClientStatus = 'active' | 'inactive';

export interface Client {
  id: number;
  tenant_id: number;
  client_type: ClientType;
  first_name: string;
  last_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}

export interface ClientPayload {
  client_type: ClientType;
  first_name: string;
  last_name?: string;
  business_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
}

export interface ClientsResponse {
  items: Client[];
  total: number;
  page: number;
  per_page: number;
}
