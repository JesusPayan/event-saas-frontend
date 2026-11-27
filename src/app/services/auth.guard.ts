import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService); 
  const router = inject(Router);
  return auth.authenticated() ? true : router.createUrlTree(['/login']);
};
export const tenantGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.authenticated() && auth.selectedTenant() && auth.tenant() ? true : router.createUrlTree(['/tenants']);
};
export const permissionGuard = (permission: string): CanActivateFn => () => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.hasPermission(permission) ? true : router.createUrlTree(['/forbidden']);
};

/** Panel global: solo operadores configurados en el backend (BILLING_OPERATOR_USER_IDS). */
export const operatorGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  return auth.isOperator() ? true : router.createUrlTree(['/forbidden']);
};

/** La landing es pública; si ya hay sesión, se va directo al panel. */
export const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  if (!auth.authenticated()) return true;
  return router.createUrlTree([auth.tenant() ? '/dashboard' : '/tenants']);
};

/** Panel de plataforma: exige alguno de los permisos de plataforma indicados (alcance global). */
export const platformGuard = (...permissions: string[]): CanActivateFn => () => {
  const auth = inject(AuthService); const router = inject(Router);
  if (!auth.authenticated()) return router.createUrlTree(['/login']);
  return auth.hasAnyPlatformPermission(...permissions) ? true : router.createUrlTree(['/forbidden']);
};

/**
 * MOD-01: ruta de un módulo. Se permite consultar módulos deshabilitados o fuera del plan
 * (datos históricos, solo lectura); se bloquean los no disponibles. El servidor valida siempre.
 */
export const moduleGuard = (code: string): CanActivateFn => () => {
  const auth = inject(AuthService); const router = inject(Router);
  const status = auth.moduleStatus(code);
  if (status === null || status === 'unavailable') {
    return auth.capabilities() === null ? true : router.createUrlTree(['/settings/modules']);
  }
  return true;
};

/** Empresas nuevas: el propietario completa el onboarding antes de usar el panel. */
export const onboardingGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  const caps = auth.capabilities();
  const pending = caps?.onboarding === 'pending' || caps?.onboarding === 'in_progress';
  return pending && auth.hasPermission('members.manage') ? router.createUrlTree(['/onboarding']) : true;
};
