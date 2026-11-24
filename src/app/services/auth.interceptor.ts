import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { BillingNoticeService } from './billing-notice.service';

const PUBLIC_AUTH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/password/',
  '/api/v1/invitations/lookup',
  '/api/v1/invitations/accept',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/v1/')) {
    return next(req);
  }

  const auth = inject(AuthService);

  const token = auth.token();
  const tenantId = auth.tenantId();

  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId !== null) {
    headers['X-Tenant-ID'] = String(tenantId);
  }

  const notices = inject(BillingNoticeService);

  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((err: unknown) => {
      // Token vencido o revocado: cerrar la sesión, salvo en endpoints públicos donde
      // un 401 significa credenciales incorrectas.
      if (err instanceof HttpErrorResponse && err.status === 401 && token
          && !PUBLIC_AUTH_PATHS.some(path => req.url.startsWith(path))) {
        auth.expireSession();
      }
      if (err instanceof HttpErrorResponse && err.status === 403
          && err.error?.error === 'billing_entitlement_denied') {
        notices.show({
          feature: String(err.error.feature_code ?? ''),
          reason: String(err.error.reason ?? ''),
          limit: err.error.limit ?? null,
          used: err.error.used ?? null,
          tier: err.error.tier ?? null,
        });
      }
      return throwError(() => err);
    })
  );
};