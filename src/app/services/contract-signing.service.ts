import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SigningInvitation {
  request_id: number;
  contract_id: number;
  document_id: number;
  document_version: number;
  signer_name: string;
  signer_role: 'client' | 'provider';
  status: 'pending' | 'verified' | 'signed' | 'expired' | 'revoked';
  expires_at: string;
}

@Injectable({ providedIn: 'root' })
export class ContractSigningService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/v1/signatures';

  invitation(token: string): Observable<SigningInvitation> {
    return this.http.get<SigningInvitation>(`${this.api}/invitations/${encodeURIComponent(token)}`);
  }
  document(token: string): Observable<Blob> {
    return this.http.get(`${this.api}/invitations/${encodeURIComponent(token)}/document`, { responseType: 'blob' });
  }
  requestOtp(token: string): Observable<{ message: string; expires_in_seconds?: number }> {
    return this.http.post<{ message: string; expires_in_seconds?: number }>(`${this.api}/otp/request`, { token });
  }
  verifyOtp(token: string, code: string): Observable<{ verified: boolean; status: string }> {
    return this.http.post<{ verified: boolean; status: string }>(`${this.api}/otp/verify`, { token, code });
  }
  sign(token: string, signer_name: string, signature_data: string, consent_accepted: boolean) {
    return this.http.post<{ signature_id: number; status: string; signed_at: string }>(`${this.api}/sign`, {
      token, signer_name, signature_data, consent_accepted,
    });
  }
}
