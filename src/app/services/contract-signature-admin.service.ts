import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export type InvitationStatus = 'pending' | 'verified' | 'signed' | 'expired' | 'revoked';
export interface ContractDocumentAdmin {
  id: number; version: number; is_final: boolean; sha256: string; created_at: string | null;
}
export interface ContractInvitationAdmin {
  id: number; document_id: number; signer_name: string; signer_email: string;
  signer_role: 'client' | 'provider'; status: InvitationStatus;
  created_at: string | null; expires_at: string | null;
  verified_at: string | null; signed_at: string | null; revoked_at: string | null;
  signature: null | { id: number; signed_at: string; signature_sha256: string; document_sha256: string };
}
export interface SignatureAuditAdmin {
  id: number; request_id: number; event_type: string; actor_type: string;
  actor_user_id: number | null; created_at: string | null;
  metadata_json: Record<string, unknown> | null;
}
export interface SignatureManagement {
  contract: { id: number; contract_number: string; status: string };
  documents: ContractDocumentAdmin[];
  invitations: ContractInvitationAdmin[];
  audits: SignatureAuditAdmin[];
}

@Injectable({ providedIn: 'root' })
export class ContractSignatureAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/contracts';
  // El interceptor existente debe añadir Authorization y X-Tenant-ID.
  management(contractId: number) {
    return this.http.get<SignatureManagement>(`${this.base}/${contractId}/signature-management`);
  }
  document(contractId: number, documentId: number) {
    return this.http.get(`${this.base}/${contractId}/signature-management/documents/${documentId}/pdf`, { responseType: 'blob' });
  }
  receipt(requestId: number) {
    return this.http.get(`${this.base}/signature-requests/${requestId}/receipt`, { responseType: 'blob' });
  }
  resendReceipt(requestId: number) {
    return this.http.post<{ message: string }>(`${this.base}/signature-requests/${requestId}/receipt/resend`, {});
  }
  invite(contractId: number, payload: { document_id: number; signer_role: 'client' | 'provider'; signer_name: string; signer_email: string }) {
    return this.http.post<{ id: number; status: string }>(`${this.base}/${contractId}/signature-requests`, payload);
  }
}
