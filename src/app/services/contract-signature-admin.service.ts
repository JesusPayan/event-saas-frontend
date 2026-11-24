
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export type InvitationStatus =
  | 'pending'
  | 'verified'
  | 'signed'
  | 'expired'
  | 'revoked';

export interface ContractDocumentAdmin {
  id: number;
  version: number;
  is_final: boolean;
  sha256: string;
  created_at: string | null;
}

export interface ContractInvitationAdmin {
  id: number;
  document_id: number;
  signer_name: string;
  signer_email: string;
  signer_role: 'client' | 'provider';
  status: InvitationStatus;
  created_at: string | null;
  expires_at: string | null;
  signed_at: string | null;
  signature: unknown | null;
}

export interface SignatureAuditAdmin {
  id: number;
  request_id: number | null;
  event_type: string;
  actor_type: string;
  created_at: string | null;
  metadata_json: unknown;
}

export interface SignatureManagement {
  contract: {
    id: number;
    contract_number: string;
    status: string;
  };
  documents: ContractDocumentAdmin[];
  invitations: ContractInvitationAdmin[];
  audits: SignatureAuditAdmin[];
}

export interface FinalizedContractDocument {
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
export class ContractSignatureAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/contracts';

  management(contractId: number) {
    return this.http.get<SignatureManagement>(
      `${this.base}/${contractId}/signature-management`
    );
  }

  finalizeDocument(contractId: number) {
    return this.http.post<FinalizedContractDocument>(
      `${this.base}/${contractId}/documents/finalize`,
      {}
    );
  }

  document(contractId: number, documentId: number) {
    return this.http.get(
      `${this.base}/${contractId}/signature-management/documents/${documentId}/pdf`,
      { responseType: 'blob' }
    );
  }

  receipt(requestId: number) {
    return this.http.get(
      `${this.base}/signature-requests/${requestId}/receipt`,
      { responseType: 'blob' }
    );
  }

  resendReceipt(requestId: number) {
    return this.http.post<{ message: string }>(
      `${this.base}/signature-requests/${requestId}/receipt/resend`,
      {}
    );
  }

  invite(
    contractId: number,
    payload: {
      document_id: number;
      signer_role: 'client' | 'provider';
      signer_name: string;
      signer_email: string;
    }
  ) {
    return this.http.post<{
      id: number;
      status: string;
    }>(
      `${this.base}/${contractId}/signature-requests`,
      payload
    );
  }
}
