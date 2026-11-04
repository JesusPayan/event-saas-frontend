
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  InventoryCategory,
  InventoryItem,
  InventoryPayload,
  InventoryPage
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/inventory';

  categories(): Observable<InventoryCategory[]> {
    return this.http.get<InventoryCategory[]>(
      `${this.baseUrl}/categories`
    );
  }

  list(
    page = 1,
    perPage = 20,
    search = ''
  ): Observable<InventoryPage> {
    let params = new HttpParams()
      .set('page', page)
      .set('per_page', perPage);

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<InventoryPage>(
      `${this.baseUrl}/items`,
      { params }
    );
  }

  getById(id: number): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(
      `${this.baseUrl}/items/${id}`
    );
  }

  create(payload: InventoryPayload): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(
      `${this.baseUrl}/items`,
      payload
    );
  }

  update(
    id: number,
    payload: Partial<InventoryPayload>
  ): Observable<InventoryItem> {
    return this.http.patch<InventoryItem>(
      `${this.baseUrl}/items/${id}`,
      payload
    );
  }

  deactivate(id: number): Observable<InventoryItem> {
    return this.http.patch<InventoryItem>(
      `${this.baseUrl}/items/${id}/deactivate`,
      {}
    );
  }
  
createCategory(payload: {
  name: string;
  description?: string | null;
}): Observable<InventoryCategory> {
  return this.http.post<InventoryCategory>(
    `${this.baseUrl}/categories`,
    payload
  );
}

updateCategory(
  id: number,
  payload: {
    name?: string;
    description?: string | null;
  }
): Observable<InventoryCategory> {
  return this.http.patch<InventoryCategory>(
    `${this.baseUrl}/categories/${id}`,
    payload
  );
}

deactivateCategory(id: number): Observable<InventoryCategory> {
  return this.http.patch<InventoryCategory>(
    `${this.baseUrl}/categories/${id}/deactivate`,
    {}
  );
}

}
