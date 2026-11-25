
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'converted';

export interface QuoteItem {
  id: number;
  inventory_item_id: number | null;
  item_type: 'inventory' | 'service' | 'custom';
  description: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  tax_rate: string;
  subtotal: string;
  tax_amount: string;
  total: string;
  sort_order: number;
  // CAT-01: partidas del catálogo de servicios.
  offer_id?: number | null;
  provider_id?: number | null;
  provider_name?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  pricing_mode?: string | null;
  price_status?: 'confirmed' | 'pending';
  fulfillment_status?: string;
  compliance_status?: string;
  service_details?: Record<string, string> | null;
}

export interface QuotePendingSummary {
  price_pending: number; confirmation_pending: number; compliance_pending: number; blocking: number;
}

export interface Quote {
  id: number;
  tenant_id: number;
  client_id: number;
  event_id: number;
  quote_number: string;
  status: QuoteStatus;
  currency: string;
  valid_until: string | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  notes: string | null;
  terms_conditions: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  items?: QuoteItem[];
  confirmed_total?: string;
  pending?: QuotePendingSummary;
}

export interface QuotesPage {
  items: Quote[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
export interface CreateQuoteItem {
  inventory_item_id?: number | null;
  item_type?: 'inventory' | 'service' | 'custom';
  description: string;
  quantity: string;
  unit_price?: string;
  discount_amount: string;
  tax_rate: string;
  offer_id?: number;
  guests?: number;
  hours?: number;
  service_notes?: string;
}

export interface CreateQuotePayload {
  client_id: number;
  event_id: number;
  valid_until: string | null;
  notes: string | null;
  terms_conditions: string | null;
  items: CreateQuoteItem[];
}


interface ClientOption {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
}

interface EventOption {
  id: number;
  name: string;
  client_id: number;
  starts_at: string;
}

export interface GeneratedContract {
  id: number;
  quote_id: number;
  contract_number: string;
  status: string;
}
@Injectable({
  providedIn: 'root'
})
export class QuotesService {

  
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/quotes';

  getQuotes(
    page = 1,
    perPage = 20
  ): Observable<QuotesPage> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage));

    return this.http.get<QuotesPage>(
      this.apiUrl,
      { params }
    );
  }

  getQuote(id: number): Observable<Quote> {
    return this.http.get<Quote>(
      `${this.apiUrl}/${id}`
    );
  }

  createQuote(payload: CreateQuotePayload): Observable<Quote> {
  return this.http.post<Quote>(
    this.apiUrl,
    payload
  );
}

  changeStatus(
    id: number,
    status: QuoteStatus,
    notes: string | null = null
  ): Observable<Quote> {
    return this.http.patch<Quote>(
      `${this.apiUrl}/${id}/status`,
      {
        status,
        notes
      }
    );
  }
  
  

  /** CAT-01: importe acordado, confirmación del proveedor o revisión documental de una partida. */
  updateItem(
    quoteId: number,
    itemId: number,
    body: { unit_price?: string; fulfillment_status?: string; compliance_status?: string; notes?: string }
  ) {
    return this.http.patch<Quote>(`${this.apiUrl}/${quoteId}/items/${itemId}`, body);
  }
}
