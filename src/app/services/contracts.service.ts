
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface GeneratedContract {
  id: number;
  quote_id: number;
  contract_number: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  client_id: number;
  event_id: number;
  currency: string;
  total: string;
}

export interface ContractDocument {
  id: number;
  contract_id: number;
  version: number;
  sha256: string;
  byte_size: number;
  mime_type: string;
  is_final: boolean;
  created_at: string | null;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/v1/contracts';

  createFromQuote(quoteId: number) {
    return this.http.post<GeneratedContract>(
      this.endpoint,
      { quote_id: quoteId }
    );
  }

  getById(contractId: number) {
    return this.http.get<GeneratedContract>(
      `${this.endpoint}/${contractId}`
    );
  }

  finalizeDocument(contractId: number) {
    return this.http.post<ContractDocument>(
      `${this.endpoint}/${contractId}/documents/finalize`,
      {}
    );
  }
}
