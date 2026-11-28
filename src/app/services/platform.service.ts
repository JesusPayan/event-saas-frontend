import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface RoleAssignment {
  id: number; user_id: number; email: string | null; role: string; role_label: string;
  scope_type: string; status: string; granted_by_email: string | null; granted_at: string | null;
}
export interface PlatformInvitation { id: number; email: string; role: string; role_label: string; expires_at: string; }
export interface RolesResponse {
  items: RoleAssignment[]; invitations: PlatformInvitation[]; assignable: string[]; can_transfer_owner: boolean;
}
export type OrganizationStatus = 'active' | 'suspended' | 'archived';
export interface Organization {
  id: number; name: string; slug: string; status: OrganizationStatus; created_at: string | null;
  members: number; subscription_status: string | null; referred: boolean;
}
export interface OrganizationAction {
  allowed: boolean; requires_reason: boolean; effect: string; blocked_reason?: string | null;
}
/** TEN-ADM: detalle administrativo (estado y suscripción por separado). */
export interface OrganizationDetail extends Organization {
  timezone: string; owners: string[]; status_reason: string | null; status_changed_at: string | null;
  status_changed_by: string | null; archived_at: string | null;
  subscription: {
    id: number; status: string; provider: string | null; plan: string | null; amount: string | null;
    currency: string | null; interval: string | null; current_period_end: string | null; canceled_at: string | null;
    renews_automatically: boolean;
  } | null;
  actions: { suspend: OrganizationAction; activate: OrganizationAction; archive: OrganizationAction; restore: OrganizationAction };
}
export interface Page<T> { items: T[]; total: number; page: number; per_page: number; }
export interface AuditEvent {
  id: number; action: string; scope_type: string; tenant_id: number | null; actor_email: string | null;
  target_type: string | null; target_id: string | null; details: Record<string, unknown> | null; created_at: string;
}
export interface Category {
  id: number; parent_id: number | null; name: string; slug: string; description: string | null;
  sort_order: number; is_active: boolean; is_inventory: boolean; requires_special_permits: boolean;
}
export interface Prospect {
  id: number; company_name: string; contact_name: string | null; contact_email: string | null; phone: string | null;
  notes: string | null; status: 'prospect' | 'invited' | 'registered' | 'discarded'; tenant_id: number | null;
  invited_at: string | null; created_at: string | null;
}
export interface Referral {
  tenant_id: number; organization: string; status: string; registered_at: string | null;
  subscription_status: string; prospect_id: number | null;
}
export interface AccessGrant {
  id: number; grantee_email: string | null; purpose: 'support' | 'training'; reason: string | null;
  state: 'active' | 'expired' | 'revoked'; granted_by_email: string | null; granted_at: string | null;
  expires_at: string | null; revoked_at: string | null;
}

export const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'Dueño de plataforma', platform_admin: 'Administrador de plataforma', promoter: 'Promotor',
  support: 'Soporte', finance: 'Finanzas', auditor: 'Auditoría',
};

/** ROLES-01 / CAT-01: plataforma, promotores, accesos delegados y categorías. */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/v1';

  roles() { return this.http.get<RolesResponse>(`${this.api}/platform/roles`); }
  grantRole(email: string, role: string) {
    return this.http.post<{ invited: boolean; invite_url?: string; email_sent?: boolean }>(
      `${this.api}/platform/roles`, { email, role });
  }
  revokeRole(id: number) { return this.http.post(`${this.api}/platform/roles/${id}/revoke`, {}); }
  revokeInvitation(id: number) { return this.http.post(`${this.api}/platform/invitations/${id}/revoke`, {}); }
  transferOwner(email: string, keepAdmin: boolean) {
    return this.http.post<{ new_owner_email: string }>(`${this.api}/platform/owner/transfer`,
      { email, keep_admin: keepAdmin });
  }
  lookupInvitation(token: string) {
    return this.http.post<{ email: string; role: string; role_label: string; user_exists: boolean; expires_at: string }>(
      `${this.api}/platform/invitations/lookup`, { token });
  }
  acceptInvitation(token: string, password: string) {
    return this.http.post<{ accepted: boolean; email: string }>(`${this.api}/platform/invitations/accept`,
      { token, password });
  }

  organizations(page = 1, search = '', status = '') {
    let params = new HttpParams().set('page', page).set('per_page', 20);
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    return this.http.get<Page<Organization>>(`${this.api}/platform/organizations`, { params });
  }
  createOrganization(body: { name: string; slug: string; owner_email: string }) {
    return this.http.post<{ organization: Organization; invite_url: string; email_sent: boolean }>(
      `${this.api}/platform/organizations`, body);
  }
  organization(id: number) {
    return this.http.get<{ organization: OrganizationDetail }>(`${this.api}/platform/organizations/${id}`);
  }
  setOrganizationStatus(id: number, status: OrganizationStatus, reason: string) {
    return this.http.patch<{ organization: Organization; changed: boolean }>(`${this.api}/platform/organizations/${id}/status`,
      { status, reason: reason || null });
  }
  audit(page = 1, action = '', tenantId: number | null = null) {
    let params = new HttpParams().set('page', page).set('per_page', 50);
    if (action) params = params.set('action', action);
    if (tenantId) params = params.set('tenant_id', tenantId);
    return this.http.get<Page<AuditEvent>>(`${this.api}/platform/audit`, { params });
  }

  categories(includeInactive = false) {
    const params = includeInactive ? new HttpParams().set('include_inactive', '1') : undefined;
    return this.http.get<{ items: Category[] }>(`${this.api}/catalog/categories`, { params });
  }
  createCategory(body: { name: string; parent_id: number | null; description?: string | null;
                         requires_special_permits?: boolean }) {
    return this.http.post<{ category: Category }>(`${this.api}/platform/catalog/categories`, body);
  }
  updateCategory(id: number, body: Partial<Pick<Category, 'name' | 'description' | 'is_active' | 'sort_order'
    | 'requires_special_permits'>>) {
    return this.http.patch<{ category: Category }>(`${this.api}/platform/catalog/categories/${id}`, body);
  }

  promoterSummary() {
    return this.http.get<{ code: string; link: string; prospects_by_status: Record<string, number>; referrals: number }>(
      `${this.api}/promoter/summary`);
  }
  prospects() { return this.http.get<{ items: Prospect[] }>(`${this.api}/promoter/prospects`); }
  createProspect(body: Partial<Prospect>) {
    return this.http.post<{ prospect: Prospect }>(`${this.api}/promoter/prospects`, body);
  }
  updateProspect(id: number, body: Partial<Prospect>) {
    return this.http.patch<{ prospect: Prospect }>(`${this.api}/promoter/prospects/${id}`, body);
  }
  inviteProspect(id: number) {
    return this.http.post<{ prospect: Prospect; link: string; email_sent: boolean }>(
      `${this.api}/promoter/prospects/${id}/invite`, {});
  }
  referrals() { return this.http.get<{ items: Referral[] }>(`${this.api}/promoter/referrals`); }

  accessGrants() { return this.http.get<{ items: AccessGrant[]; max_days: number }>(`${this.api}/access-grants`); }
  createAccessGrant(body: { email: string; purpose: 'support' | 'training'; days: number; reason?: string | null }) {
    return this.http.post<{ grant: AccessGrant }>(`${this.api}/access-grants`, body);
  }
  revokeAccessGrant(id: number) { return this.http.post(`${this.api}/access-grants/${id}/revoke`, {}); }
}
