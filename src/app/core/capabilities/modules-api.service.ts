import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  BusinessType, BusinessTypeSelection, OnboardingPreview, OnboardingStatus, TenantBusinessType, TenantModule,
} from './capability.models';

export interface PlatformModule {
  code: string; name: string; description: string; category: string; essential: boolean; configurable: boolean;
  depends_on: string[]; capabilities: string[]; availability: string; is_active: boolean; organizations: number;
  plans: string[];
}
export interface FeatureFlag { code: string; enabled: boolean; description: string | null; }
export interface PlanSummary { id: number; code: string; name: string; active: boolean; restricted_modules: number; }
export interface Adoption {
  organizations: number; by_business_type: { code: string; name: string; organizations: number }[];
  primary_business_type: { code: string; organizations: number }[];
  modules_enabled: { code: string; organizations: number }[]; onboarding: Partial<Record<string, number>>;
  onboarding_stale: number; plans_by_business_type: { business_type: string; plan: string; organizations: number }[];
}

/** MOD-01: giros comerciales, módulos, onboarding y administración de plataforma. */
@Injectable({ providedIn: 'root' })
export class ModulesApiService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/v1';

  businessTypes() { return this.http.get<{ items: BusinessType[] }>(`${this.api}/business-types`); }
  tenantBusinessTypes() { return this.http.get<{ items: TenantBusinessType[] }>(`${this.api}/tenants/current/business-types`); }
  setBusinessTypes(items: BusinessTypeSelection[], applyRecommendations: boolean) {
    return this.http.patch<{ result: { business_types: string[]; enabled_modules: string[] }; recommended: string[] }>(
      `${this.api}/tenants/current/business-types`, { items, apply_recommendations: applyRecommendations });
  }
  tenantModules() { return this.http.get<{ items: TenantModule[] }>(`${this.api}/tenants/current/modules`); }
  setModules(modules: Record<string, boolean>) {
    return this.http.patch<{ result: { applied: Record<string, boolean>; auto_enabled: string[] }; items: TenantModule[] }>(
      `${this.api}/tenants/current/modules`, { modules });
  }
  moduleImpact(code: string) {
    return this.http.get<{ module: string; operations: { type: string; count: number; message: string }[]; dependents: string[] }>(
      `${this.api}/tenants/current/modules/${code}/impact`);
  }

  onboardingStatus() { return this.http.get<OnboardingStatus>(`${this.api}/onboarding/status`); }
  saveDraft(draft: { business_types: BusinessTypeSelection[]; modules: Record<string, boolean>; step: number }) {
    return this.http.put<OnboardingStatus>(`${this.api}/onboarding/draft`, draft);
  }
  preview(body: { business_types: BusinessTypeSelection[]; modules?: Record<string, boolean> }) {
    return this.http.post<OnboardingPreview>(`${this.api}/onboarding/preview`, body);
  }
  complete(body: { business_types: BusinessTypeSelection[]; modules: Record<string, boolean> }) {
    return this.http.post<OnboardingStatus & { already_completed: boolean }>(`${this.api}/onboarding/complete`, body);
  }

  // Plataforma
  platformBusinessTypes() { return this.http.get<{ items: BusinessType[] }>(`${this.api}/platform/business-types`); }
  createBusinessType(body: Partial<BusinessType>) {
    return this.http.post<{ item: BusinessType }>(`${this.api}/platform/business-types`, body);
  }
  updateBusinessType(id: number, body: Partial<BusinessType>) {
    return this.http.patch<{ item: BusinessType }>(`${this.api}/platform/business-types/${id}`, body);
  }
  setTemplate(id: number, modules: string[]) {
    return this.http.put<{ modules: string[]; template_version: number }>(
      `${this.api}/platform/business-types/${id}/modules`, { modules });
  }
  platformModules() { return this.http.get<{ items: PlatformModule[]; feature_flags: FeatureFlag[] }>(`${this.api}/platform/modules`); }
  setModuleActive(code: string, isActive: boolean) {
    return this.http.patch(`${this.api}/platform/modules/${code}`, { is_active: isActive });
  }
  setFlag(code: string, enabled: boolean) { return this.http.patch(`${this.api}/platform/feature-flags/${code}`, { enabled }); }
  plans() { return this.http.get<{ items: PlanSummary[] }>(`${this.api}/platform/plans`); }
  planModules(id: number) { return this.http.get<{ modules: string[]; restricted: boolean }>(`${this.api}/platform/plans/${id}/modules`); }
  setPlanModules(id: number, modules: string[]) {
    return this.http.put<{ modules: string[]; restricted: boolean }>(`${this.api}/platform/plans/${id}/modules`, { modules });
  }
  adoption() { return this.http.get<Adoption>(`${this.api}/platform/modules/adoption`); }
}
