import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export type BillingInterval = 'month' | 'year';

export interface PlanPrice {
  id: number;
  amount: string;
  currency: string;
  billing_interval: BillingInterval;
  version: number;
  active?: boolean;
  created_at?: string | null;
}
export interface PlanEntitlement { feature_code: string; limit_value: number | null; }
export interface Plan {
  id: number; code: string; name: string; description: string | null;
  prices: PlanPrice[]; entitlements: PlanEntitlement[];
}
export interface SubscriptionInfo {
  id: number; plan_name: string | null; plan_code: string | null; plan_price_id: number;
  status: string; current_period_start: string | null; current_period_end: string | null;
  trial_ends_at: string | null; canceled_at: string | null;
}
export interface SubscriptionResponse { status: string; subscription: SubscriptionInfo | null; }
export interface CheckoutResponse { checkout_id: number; init_point: string; status: string; }
export interface CheckoutStatus {
  checkout: null | { id: number; status: string; plan_price_id: number; created_at: string | null };
}
export interface UsageItem { feature_code: string; limit_value: number | null; used: number | null; remaining: number | null; }
export interface UsageResponse { status: string; tier?: 'paid' | 'free'; items: UsageItem[]; }

export const FEATURE_LABELS: Partial<Record<string, string>> = {
  members: 'Usuarios',
  clients: 'Clientes',
  events: 'Eventos',
  inventory: 'Inventario',
  quotes_contracts: 'Cotizaciones y contratos',
  advanced_reports: 'Reportes avanzados (exportación)',
  external_api: 'API externa',
};

export interface OperatorPlan {
  id: number; name: string; code: string; active: boolean;
  active_subscriptions: number; prices: PlanPrice[];
}
export interface PriceAudit {
  id: number; plan_id: number; plan_price_id: number; previous_price_id: number | null;
  action: 'reprice' | 'activate' | 'deactivate'; old_amount: string | null; new_amount: string | null;
  actor_id: number; created_at: string | null;
}
export interface Page<T> { total: number; page: number; page_size: number; items: T[]; }
export interface OperatorSubscription {
  id: number; tenant_id: number; tenant_name: string; tenant_slug: string;
  plan_code: string; plan_name: string; plan_price_id: number; amount: string; currency: string;
  billing_interval: BillingInterval; price_version: number; status: string; provider: string | null;
  current_period_start: string | null; current_period_end: string | null;
  canceled_at: string | null; created_at: string | null;
}
export interface OperatorPayment {
  id: number; provider_payment_id: string; status: string; amount: string; currency: string; created_at: string | null;
}
export interface OperatorAudit {
  id: number; subscription_id: number; action: string; old_status: string | null;
  new_status: string; actor_id: number | null; created_at: string | null;
}
export interface ReconciliationIssue {
  id: number; resource_type: string; resource_id: string; reason: string; attempts: number;
  first_seen_at: string | null; last_seen_at: string | null; resolved_at: string | null;
}

/** Etiquetas en español para los estados de suscripción del backend. */
export const SUBSCRIPTION_STATUS_LABELS: Partial<Record<string, string>> = {
  not_subscribed: 'Sin suscripción',
  incomplete: 'Incompleta',
  trialing: 'En prueba',
  active: 'Activa',
  past_due: 'Pago pendiente',
  paused: 'Pausada',
  canceled: 'Cancelada',
  expired: 'Vencida',
};

export const SUBSCRIPTION_STATUS_CLASSES: Partial<Record<string, string>> = {
  active: 'bg-green-100 text-green-800',
  trialing: 'bg-blue-100 text-blue-800',
  past_due: 'bg-amber-100 text-amber-800',
  paused: 'bg-gray-100 text-gray-800',
  incomplete: 'bg-gray-100 text-gray-800',
  canceled: 'bg-red-100 text-red-800',
  expired: 'bg-red-100 text-red-800',
};

/** Precios y conceptos siempre vienen del backend (MySQL); Angular nunca envía importes. */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/billing';

  listPlans() { return this.http.get<{ items: Plan[] }>(`${this.base}/plans`); }
  current() { return this.http.get<SubscriptionResponse>(`${this.base}/subscription`); }
  usage() { return this.http.get<UsageResponse>(`${this.base}/usage`); }
  checkout(plan_price_id: number, payer_email: string) {
    return this.http.post<CheckoutResponse>(`${this.base}/mercadopago/checkout`, { plan_price_id, payer_email });
  }
  latestCheckout() { return this.http.get<CheckoutStatus>(`${this.base}/mercadopago/checkout/latest`); }
  cancel() { return this.http.post<{ status: string }>(`${this.base}/mercadopago/cancel`, {}); }

  // ---- Operador global ----
  operatorPrices(history = false) {
    const params = history ? new HttpParams().set('history', '1') : undefined;
    return this.http.get<{ items: OperatorPlan[] }>(`${this.base}/admin/prices`, { params });
  }
  priceAudits(page = 1) {
    return this.http.get<Page<PriceAudit>>(`${this.base}/admin/prices/audits`, {
      params: new HttpParams().set('page', page).set('page_size', 20),
    });
  }
  updatePrice(id: number, amount: string) {
    return this.http.post<{ price: PlanPrice }>(`${this.base}/admin/prices/${id}/reprice`, { amount });
  }
  setPriceActive(id: number, active: boolean) {
    return this.http.post<{ price: PlanPrice }>(`${this.base}/admin/prices/${id}/${active ? 'activate' : 'deactivate'}`, {});
  }
  operatorSubscriptions(page: number, status: string, q: string) {
    let params = new HttpParams().set('page', page).set('page_size', 20);
    if (status) params = params.set('status', status);
    if (q.trim()) params = params.set('q', q.trim());
    return this.http.get<Page<OperatorSubscription>>(`${this.base}/admin/subscriptions`, { params });
  }
  tenantPayments(tenantId: number) {
    return this.http.get<{ items: OperatorPayment[] }>(`${this.base}/admin/tenants/${tenantId}/payments`);
  }
  tenantAudits(tenantId: number) {
    return this.http.get<{ items: OperatorAudit[] }>(`${this.base}/admin/tenants/${tenantId}/audits`);
  }
  reconciliationIssues() {
    return this.http.get<{ items: ReconciliationIssue[] }>(`${this.base}/admin/reconciliation-issues`);
  }
}
