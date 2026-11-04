import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {   Observable,
  tap,
  catchError,
  throwError,
 switchMap } from 'rxjs';

export interface TenantRef { id: number; name?: string; slug?: string; }
export interface MeResponse { id: number; email: string; tenants: number[]; }
export interface LoginResponse { access_token: string; token_type: string; expires_in: number; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  // Access token remains in memory, not localStorage. Reload requires signing in again.
  private hostUrl = 'http://127.0.0.1:5000/api/v1';
  private accessToken = signal<string | null>(null);
  readonly me = signal<MeResponse | null>(null);
  readonly tenantId = signal<number | null>(null);
  readonly tenant = signal<TenantRef | null>(null);
  readonly permissions = signal<string[]>([]);
  readonly authenticated = computed(() => this.accessToken() !== null && this.me() !== null);
  readonly selectedTenant = computed(() => this.tenantId() !== null);
  token(): string | null { return this.accessToken(); }
  login(email: string, password: string): Observable<LoginResponse> {
    console.log('AuthService.login() called with email:', email);
    return this.http.post<LoginResponse>(`${this.hostUrl}/auth/login`, { email, password }).pipe(
      tap(r => this.accessToken.set(r.access_token)));
  }
  register(email: string, password: string, company_name: string, slug: string) {
    console.log('AuthService.register() called with email:', email);
    return this.http.post(`${this.hostUrl}/auth/register`, { email, password, company_name, slug });
  }
  loadMe() { return this.http.get<MeResponse>(`${this.hostUrl}/auth/me`).pipe(tap(me => this.me.set(me))); }
//   chooseTenant(id: number): Observable<TenantRef> {
//   this.tenantId.set(id);
//   this.tenant.set(null);
//   this.permissions.set([]);

//   return this.http.get<TenantRef>(
//     '/api/v1/tenants/current'
//   ).pipe(
//     tap(tenant => {
//       this.tenant.set(tenant);
//     }),
//     catchError(error => {
//       this.tenantId.set(null);
//       this.tenant.set(null);
//       this.permissions.set([]);

//       return throwError(() => error);
//     })
//   );
// }
// chooseTenant(id: number): Observable<TenantRef> {

//   this.tenantId.set(id);
//   this.tenant.set(null);
//   this.permissions.set([]);

//   return this.http.get<TenantRef>(
//     '/api/v1/tenants/current'
//   ).pipe(
//     tap(tenant => {
//       this.tenant.set(tenant);
//     }),
//     catchError(error => {
//       this.tenantId.set(null);
//       this.tenant.set(null);
//       this.permissions.set([]);

//       return throwError(() => error);
//     })
//   );
// }
  // loadPermissions() { return this.http.get<{permissions: string[]}>(`${this.hostUrl}/auth/permissions`).pipe(tap(r => this.permissions.set(r.permissions))); }
  
chooseTenant(id: number): Observable<TenantRef> {
  this.tenantId.set(id);
  this.tenant.set(null);
  this.permissions.set([]);

  return this.http.get<TenantRef>(
    '/api/v1/tenants/current'
  ).pipe(
    switchMap(tenant =>
      this.loadPermissions().pipe(
        tap(() => this.tenant.set(tenant)),
        // Conservamos TenantRef como resultado
        // para no romper los componentes existentes.
        switchMap(() => [tenant])
      )
    ),
    catchError(error => {
      this.tenantId.set(null);
      this.tenant.set(null);
      this.permissions.set([]);

      return throwError(() => error);
    })
  );
}

  loadPermissions(): Observable<{ permissions: string[] }> {
  return this.http.get<{ permissions: string[] }>(
    '/api/v1/auth/permissions'
  ).pipe(
    tap(response => {
      this.permissions.set(response.permissions);
    })
  );
}
  hasPermission(code: string): boolean { return this.permissions().includes(code); }
  logout(): void {
    this.accessToken.set(null); this.me.set(null); this.tenantId.set(null);
    this.tenant.set(null); this.permissions.set([]);
    void this.router.navigateByUrl('/login');
  }
  debugAuth(): void {
  console.table({
    authenticated: this.authenticated(),
    tenantId: this.tenantId(),
    tenantLoaded: this.tenant() !== null,
    inventoryRead: this.hasPermission('inventory.read'),
    inventoryCreate: this.hasPermission('inventory.create'),
    inventoryUpdate: this.hasPermission('inventory.update')
  });

  console.log('Permisos cargados:', this.permissions());
}
}
