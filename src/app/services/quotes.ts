
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
}

export interface QuotesPage {
  items: Quote[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
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

  createQuote(payload: unknown): Observable<Quote> {
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
}
