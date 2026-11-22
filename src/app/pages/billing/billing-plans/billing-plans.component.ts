import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PlanPrice { id: number; amount: string; currency: string; billing_interval: 'month' | 'year'; version: number; }
export interface PlanEntitlement { feature_code: string; limit_value: number | null; }
export interface Plan { id: number; code: string; name: string; description: string | null; prices: PlanPrice[]; entitlements: PlanEntitlement[]; }
export interface SubscriptionResponse { status: string; subscription: null | { id: number; plan_name: string | null; plan_code: string | null; status: string; current_period_end: string | null; }; }
export interface CheckoutResponse { checkout_id: number; init_point: string; status: string; }
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  listPlans() { return this.http.get<{ items: Plan[] }>('/api/v1/billing/plans'); }
  current() { return this.http.get<SubscriptionResponse>('/api/v1/billing/subscription'); }
  checkout(plan_price_id: number, payer_email: string) {
    return this.http.post<CheckoutResponse>('/api/v1/billing/mercadopago/checkout', { plan_price_id, payer_email });
  }
  operatorPrices() { return this.http.get<{ items: OperatorPlan[] }>('/api/v1/billing/admin/prices'); }
  updatePrice(id: number, amount: string) { return this.http.post<{ price: PlanPrice }>('/api/v1/billing/admin/prices/' + id + '/reprice', { amount }); }
}
export interface OperatorPlan { id: number; name: string; code: string; prices: PlanPrice[]; }
