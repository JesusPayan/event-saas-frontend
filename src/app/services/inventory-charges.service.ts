
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  InventoryCharge,
  ChargeAudit,
  ApiList,
  ChargeActionPayload
} from '../models/inventory-charge.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryChargesService {
  private http = inject(HttpClient);

  private readonly apiUrl = '/api/v1/inventory/charges';

  getCharges(): Observable<ApiList<InventoryCharge>> {
    return this.http.get<ApiList<InventoryCharge>>(
      this.apiUrl
    );
  }

  getAudit(
    chargeId: number
  ): Observable<ApiList<ChargeAudit>> {
    return this.http.get<ApiList<ChargeAudit>>(
      `${this.apiUrl}/${chargeId}/audit`
    );
  }

  approve(
    chargeId: number,
    notes: string
  ): Observable<InventoryCharge> {
    return this.http.post<InventoryCharge>(
      `${this.apiUrl}/${chargeId}/approve`,
      { notes }
    );
  }

  waive(
    chargeId: number,
    notes: string
  ): Observable<InventoryCharge> {
    return this.http.post<InventoryCharge>(
      `${this.apiUrl}/${chargeId}/waive`,
      { notes }
    );
  }

  pay(
    chargeId: number,
    payload: ChargeActionPayload
  ): Observable<InventoryCharge> {
    return this.http.post<InventoryCharge>(
      `${this.apiUrl}/${chargeId}/pay`,
      payload
    );
  }
}
