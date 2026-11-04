
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Client,
  ClientPayload,
  ClientsResponse
} from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private http = inject(HttpClient);
  private readonly api = '/api/v1/clients';

  getAll(
    page = 1,
    search = '',
    status = ''
  ) {
    let params = new HttpParams()
      .set('page', page)
      .set('per_page', 20);

    if (search) {
      params = params.set('search', search);
    }

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<ClientsResponse>(
      this.api,
      { params }
    );
  }

  getById(id: number) {
    return this.http.get<Client>(
      `${this.api}/${id}`
    );
  }

  create(data: ClientPayload) {
    return this.http.post<Client>(
      this.api,
      data
    );
  }

  update(
    id: number,
    data: Partial<ClientPayload>
  ) {
    return this.http.patch<Client>(
      `${this.api}/${id}`,
      data
    );
  }

  deactivate(id: number) {
    return this.http.patch<Client>(
      `${this.api}/${id}/deactivate`,
      {}
    );
  }
}
