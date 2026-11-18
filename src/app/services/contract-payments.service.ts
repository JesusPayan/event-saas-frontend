
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type PaymentType = 'advance' | 'installment';
export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card'
  | 'other';

export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled';

export interface ContractPayment {
  id: number;
  tenant_id: number;
  contract_id: number;
  payment_type: PaymentType;
  amount: string;
  currency: string;
  payment_method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  notes: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  created_by: number;
  confirmed_by: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ContractPaymentBalance {
  contract_id: number;
  currency: string;
  total: string;
  paid: string;
  balance: string;
}

export interface PaymentAudit {
  id: number;
  payment_id: number;
  action: string;
  previous_status: string | null;
  new_status: string;
  notes: string | null;
  changed_by: number;
  created_at: string | null;
}

export interface PaymentListResponse {
  items: ContractPayment[];
  total: number;
}

export interface PaymentAuditResponse {
  items: PaymentAudit[];
  total: number;
}

export interface CreatePaymentRequest {
  amount: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  reference?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ContractPaymentsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/contracts';

  private url(contractId: number): string {
    return `${this.base}/${contractId}/payments`;
  }

  list(contractId: number): Observable<PaymentListResponse> {
    return this.http.get<PaymentListResponse>(
      this.url(contractId)
    );
  }

  balance(contractId: number): Observable<ContractPaymentBalance> {
    return this.http.get<ContractPaymentBalance>(
      `${this.url(contractId)}/balance`
    );
  }

  create(
    contractId: number,
    payload: CreatePaymentRequest
  ): Observable<ContractPayment> {
    return this.http.post<ContractPayment>(
      this.url(contractId),
      payload
    );
  }

  confirm(
    contractId: number,
    paymentId: number
  ): Observable<ContractPayment> {
    return this.http.patch<ContractPayment>(
      `${this.url(contractId)}/${paymentId}/confirm`,
      {}
    );
  }

  cancel(
    contractId: number,
    paymentId: number,
    notes?: string
  ): Observable<ContractPayment> {
    return this.http.patch<ContractPayment>(
      `${this.url(contractId)}/${paymentId}/cancel`,
      notes ? { notes } : {}
    );
  }

  audit(
    contractId: number,
    paymentId: number
  ): Observable<PaymentAuditResponse> {
    return this.http.get<PaymentAuditResponse>(
      `${this.url(contractId)}/${paymentId}/audit`
    );
  }
}
