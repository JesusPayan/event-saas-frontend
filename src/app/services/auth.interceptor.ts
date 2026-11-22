import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { BillingNoticeService } from './billing-notice.service';

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
      if (err instanceof HttpErrorResponse && err.status === 403
          && err.error?.error === 'billing_entitlement_denied') {
        notices.show({
          feature: String(err.error.feature_code ?? ''),
          reason: String(err.error.reason ?? ''),
          limit: err.error.limit ?? null,
          used: err.error.used ?? null,
        });
      }
      return throwError(() => err);
    })
  );
};