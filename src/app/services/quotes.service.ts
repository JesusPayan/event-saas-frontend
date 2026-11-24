
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Quote,
  QuoteStatus,
  QuotesPage,GeneratedContract
} from './quotes';

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

  downloadPdf(id: number): Observable<Blob> {
  return this.http.get(
    `${this.apiUrl}/${id}/pdf`,
    { responseType: 'blob' }
  );
}





  private readonly baseUrl = '/api/v1/contracts';

  createFromQuote(quoteId: number) {
    return this.http.post<GeneratedContract>(
      this.baseUrl,
      { quote_id: quoteId }
    );
  }

  getById(contractId: number) {
    return this.http.get<GeneratedContract>(
      `${this.baseUrl}/${contractId}`
    );
  }
}

