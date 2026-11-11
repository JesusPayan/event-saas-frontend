
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Quote,
  QuoteStatus,
  QuotesPage
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
}
