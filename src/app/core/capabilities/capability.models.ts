/** MOD-01: modelos del motor de capacidades (espejo de /tenants/current/capabilities). */
export type ModuleStatus = 'active' | 'disabled' | 'plan_locked' | 'dependency_missing' | 'unavailable';

export interface TenantModule {
  code: string; name: string; description: string; icon: string; category: string; sort_order: number;
  essential: boolean; configurable: boolean; status: ModuleStatus; enabled: boolean; in_plan: boolean;
  depends_on: string[]; capabilities: string[]; availability: 'available' | 'experimental' | 'coming_soon';
  routes: string[];
}

export interface TenantBusinessType {
  code: string; name: string; icon: string | null; is_primary: boolean; is_internal: boolean;
  custom_description: string | null;
}

export interface CapabilitiesResponse {
  modules: TenantModule[]; effective_modules: string[]; capabilities: string[]; plan_restricted: boolean;
  enforcement: boolean; onboarding: 'pending' | 'in_progress' | 'completed' | 'legacy';
  business_types: TenantBusinessType[];
}

export interface BusinessType {
  id: number; code: string; name: string; description: string | null; icon: string | null; sort_order: number;
  is_active: boolean; is_internal: boolean; allows_custom_description: boolean; template_version: number;
  recommended_modules: string[] | null; organizations?: number;
}

export interface BusinessTypeSelection { code: string; is_primary: boolean; custom_description?: string | null; }

export interface PreviewModule {
  code: string; name: string; description: string; icon: string; essential: boolean; recommended: boolean;
  state: 'essential' | 'selected' | 'available' | 'requires_upgrade' | 'coming_soon'; depends_on: string[];
  routes: string[];
}

export interface OnboardingPreview {
  recommended: string[]; modules: PreviewModule[];
  workspace: { code: string; name: string; routes: string[] }[];
}

export interface OnboardingStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'legacy'; required: boolean; current_step: number | null;
  draft: { business_types: BusinessTypeSelection[]; modules: Record<string, boolean>; step: number } | null;
  completed_at: string | null; business_types: TenantBusinessType[]; can_manage?: boolean;
}

export const MODULE_ERRORS: Record<string, string> = {
  module_disabled: 'Este módulo está deshabilitado para tu empresa. Puedes activarlo en Configuración → Módulos.',
  plan_upgrade_required: 'Tu plan actual no incluye este módulo. Puedes consultarlo, pero no modificarlo.',
  module_unavailable: 'Este módulo no está disponible por ahora.',
  module_dependency_required: 'Primero ajusta los módulos que dependen de este.',
  module_has_active_operations: 'No se puede deshabilitar: tiene operaciones en curso.',
  module_essential: 'Este módulo es esencial y siempre está activo.',
  unknown_module: 'Módulo desconocido.',
  business_type_not_available: 'Ese giro no está disponible.',
  primary_business_type_required: 'Elige exactamente un giro principal.',
  custom_description_required: 'Describe tu giro en «Otro giro comercial».',
};
