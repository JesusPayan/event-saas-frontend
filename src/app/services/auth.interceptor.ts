import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

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

  return next(
    req.clone({
      setHeaders: headers
    })
  );
};
