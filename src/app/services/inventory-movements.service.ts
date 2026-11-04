
import { Injectable, inject } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import {
  InventoryMovementRequest,
  InventoryMovementResult,
  InventoryMovementsResponse
} from '../models/inventory-movement.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryMovementsService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    '/api/v1/inventory/movements';

  /**
   * Consulta el historial de movimientos
   * de una reservación.
   */
  getMovements(
    reservationId: number
  ): Observable<InventoryMovementsResponse> {

    const params = new HttpParams().set(
      'reservation_id',
      reservationId.toString()
    );

    return this.http.get<InventoryMovementsResponse>(
      this.apiUrl,
      { params }
    );
  }

  /**
   * Registra la entrega de artículos.
   */
  dispatch(
    payload: InventoryMovementRequest
  ): Observable<InventoryMovementResult> {

    return this.http.post<InventoryMovementResult>(
      `${this.apiUrl}/dispatch`,
      payload
    );
  }

  /**
   * Registra la devolución de artículos.
   */
  returnItems(
    payload: InventoryMovementRequest
  ): Observable<InventoryMovementResult> {

    return this.http.post<InventoryMovementResult>(
      `${this.apiUrl}/return`,
      payload
    );
  }

  /**
   * Alias para compatibilidad con
   * InventoryMovementManagerComponent.
   */
  getHistory(
    reservationId: number
  ): Observable<InventoryMovementsResponse> {
    return this.getMovements(reservationId);
  }

  returnInventory(
    payload: InventoryMovementRequest
  ): Observable<InventoryMovementResult> {
    return this.returnItems(payload);
  }
}
