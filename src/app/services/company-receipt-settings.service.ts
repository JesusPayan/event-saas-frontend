import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface CompanyReceiptSettings {
  commercial_name: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  timezone: string;
  has_logo: boolean;
  tenant_name: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyReceiptSettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/company/receipt-settings';
  get() { return this.http.get<CompanyReceiptSettings>(this.base); }
  update(payload: Partial<CompanyReceiptSettings>) {
    return this.http.patch<CompanyReceiptSettings>(this.base, payload);
  }
  uploadLogo(file: File) {
    const body = new FormData(); body.append('logo', file);
    return this.http.put<{ message: string }>(`${this.base}/logo`, body);
  }
  logo() { return this.http.get(`${this.base}/logo`, { responseType: 'blob' }); }
  removeLogo() { return this.http.delete<void>(`${this.base}/logo`); }
}
