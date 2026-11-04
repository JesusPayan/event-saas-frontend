import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuotesService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/quotes';

  getQuotes(page = 1, perPage = 20): Observable<unknown> {

    const params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    return this.http.get<unknown>(
      this.apiUrl,
      { params }
    );
  }

  getQuote(id: number): Observable<unknown> {
    return this.http.get<unknown>(
      `${this.apiUrl}/${id}`
    );
  }

  createQuote(payload: unknown): Observable<unknown> {
    return this.http.post<unknown>(
      this.apiUrl,
      payload
    );
  }
}