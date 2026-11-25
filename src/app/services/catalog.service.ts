import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export type PricingMode = 'unit' | 'per_person' | 'per_hour' | 'package' | 'per_event' | 'quote';
export type FulfillmentType = 'inventory' | 'schedule' | 'manual';

export interface CatalogEntry {
  kind: 'offer' | 'inventory'; id: number; name: string; description: string | null;
  status: 'draft' | 'published' | 'archived'; category_id: number; category_name: string | null;
  provider_id: number | null; provider_name: string | null; pricing_mode: PricingMode; pricing_label: string;
  unit_price: string | null; price_pending: boolean; fulfillment_type: FulfillmentType;
  inventory_item_id: number | null; duration_hours?: string | null; min_guests?: number | null;
  max_guests?: number | null; coverage?: string | null; min_notice_days?: number | null;
  setup_requirements?: string | null; daily_capacity?: number | null; requires_provider_confirmation?: boolean;
  venue_restrictions?: string | null; required_documents?: string | null; requires_special_permits: boolean;
  unit?: string | null; sku?: string | null;
}
export interface Provider {
  id: number; name: string; contact_name: string | null; contact_email: string | null; phone: string | null;
  notes: string | null; status: 'active' | 'inactive';
}
export interface ProviderItem {
  id: number; description: string; quantity: string; unit_price: string; total: string; pricing_mode: string | null;
  price_status: 'confirmed' | 'pending'; fulfillment_status: string; compliance_status: string;
  service_details: Record<string, string> | null; quote_id: number; quote_number: string; quote_status: string;
  event_name: string; event_starts_at: string | null; event_location: string | null;
  estimated_guests: number | null; category_name: string | null;
}

export const PRICING_LABELS: Record<PricingMode, string> = {
  unit: 'Por unidad', per_person: 'Por persona', per_hour: 'Por hora', package: 'Por paquete',
  per_event: 'Por evento', quote: 'Bajo cotización',
};
export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  inventory: 'Consume inventario', schedule: 'Agenda del proveedor', manual: 'Confirmación manual',
};
export const ITEM_STATUS_LABELS: Record<string, string> = {
  not_required: 'No requiere', pending_confirmation: 'Pendiente de confirmación', available: 'Disponible',
  confirmed: 'Confirmado', unavailable: 'No disponible', pending: 'Pendiente', approved: 'Aprobado',
};
export const ITEM_STATUS_CLASSES: Record<string, string> = {
  not_required: 'bg-gray-100 text-gray-600', pending_confirmation: 'bg-amber-100 text-amber-800',
  available: 'bg-blue-100 text-blue-800', confirmed: 'bg-green-100 text-green-800',
  unavailable: 'bg-red-100 text-red-800', pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
};

/** CAT-01: catálogo de la organización, proveedores y portal de proveedores. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/v1';

  offers(filters: { categoryId?: number | null; search?: string; status?: string; publishedOnly?: boolean;
                    includeInventory?: boolean; page?: number } = {}) {
    let params = new HttpParams().set('page', filters.page ?? 1).set('per_page', 100);
    if (filters.categoryId) params = params.set('category_id', filters.categoryId);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.publishedOnly) params = params.set('published_only', '1');
    if (filters.includeInventory === false) params = params.set('include_inventory', '0');
    return this.http.get<{ items: CatalogEntry[]; total: number }>(`${this.api}/catalog/offers`, { params });
  }
  offer(id: number) { return this.http.get<{ offer: CatalogEntry }>(`${this.api}/catalog/offers/${id}`); }
  createOffer(body: Record<string, unknown>) {
    return this.http.post<{ offer: CatalogEntry }>(`${this.api}/catalog/offers`, body);
  }
  updateOffer(id: number, body: Record<string, unknown>) {
    return this.http.patch<{ offer: CatalogEntry }>(`${this.api}/catalog/offers/${id}`, body);
  }

  providers() { return this.http.get<{ items: Provider[] }>(`${this.api}/providers`); }
  createProvider(body: Partial<Provider>) {
    return this.http.post<{ provider: Provider }>(`${this.api}/providers`, body);
  }
  updateProvider(id: number, body: Partial<Provider>) {
    return this.http.patch<{ provider: Provider }>(`${this.api}/providers/${id}`, body);
  }

  myItems() { return this.http.get<{ items: ProviderItem[] }>(`${this.api}/provider/items`); }
  updateMyItem(id: number, body: { unit_price?: string; fulfillment_status?: string; notes?: string }) {
    return this.http.patch<{ item: ProviderItem }>(`${this.api}/provider/items/${id}`, body);
  }
}
