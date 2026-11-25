import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, map, switchMap, tap, throwError } from 'rxjs';

export interface TenantRef { id: number; name?: string; slug?: string; }
export interface TenantSummary {
  id: number; name: string | null; slug: string | null; role: string | null;
  status?: string | null;
  /** Acceso delegado temporal (solo lectura). */
  purpose?: 'support' | 'training'; expires_at?: string;
}
export interface PlatformAccess { roles: string[]; permissions: string[]; }
export interface MeResponse {
  id: number; email: string; tenants: number[]; tenant_details?: TenantSummary[];
  platform?: PlatformAccess;
}
export interface LoginResponse { access_token: string; token_type: string; expires_in: number; }

interface StoredSession { token: string; tenantId: number | null; expiresAt: number; }

const STORAGE_KEY = 'evsaas.session';
/** Renueva el token cuando le quedan menos de 10 minutos. */
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

/**
 * Sesión del usuario.
 *
 * El token se guarda en sessionStorage: sobrevive a recargas de la página, pero se
 * borra al cerrar la pestaña y no se comparte entre pestañas. Se renueva solo mientras
 * la app está abierta; el backend limita la duración total (SESSION_MAX_AGE) y revoca
 * todas las sesiones si cambia la contraseña.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly hostUrl = '/api/v1';
  private readonly accessToken = signal<string | null>(null);
  private expiresAt = 0;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly me = signal<MeResponse | null>(null);
  readonly tenantId = signal<number | null>(null);
  readonly tenant = signal<TenantRef | null>(null);
  readonly permissions = signal<string[]>([]);
  /** Operador global de la plataforma (validado siempre por el backend). */
  readonly isOperator = signal(false);
  /** Roles y permisos de plataforma (alcance global). */
  readonly platformRoles = computed(() => this.me()?.platform?.roles ?? []);
  readonly platformPermissions = computed(() => this.me()?.platform?.permissions ?? []);
  /** Proveedor vinculado al usuario en la empresa actual (rol «provider»). */
  readonly providerId = signal<number | null>(null);
  /** La empresa actual se consulta con un acceso delegado de solo lectura. */
  readonly delegatedAccess = signal(false);
  /** Motivo del último cierre de sesión forzado (para mostrarlo en el login). */
  readonly endedReason = signal<'expired' | null>(null);
  readonly authenticated = computed(() => this.accessToken() !== null && this.me() !== null);
  readonly selectedTenant = computed(() => this.tenantId() !== null);

  token(): string | null { return this.accessToken(); }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.hostUrl}/auth/login`, { email, password }).pipe(
      tap(r => { this.endedReason.set(null); this.setToken(r.access_token, r.expires_in); }));
  }

  register(email: string, password: string, company_name: string, slug: string, ref?: string | null) {
    return this.http.post(`${this.hostUrl}/auth/register`,
      ref ? { email, password, company_name, slug, ref } : { email, password, company_name, slug });
  }

  hasPlatformPermission(code: string): boolean { return this.platformPermissions().includes(code); }
  hasAnyPlatformPermission(...codes: string[]): boolean { return codes.some(code => this.hasPlatformPermission(code)); }

  forgotPassword(email: string) {
    return this.http.post<{ accepted: boolean }>(`${this.hostUrl}/auth/password/forgot`, { email });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<{ reset: boolean }>(`${this.hostUrl}/auth/password/reset`, { token, password });
  }

  loadMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.hostUrl}/auth/me`).pipe(
      tap(me => {
        this.me.set(me);
        // El panel global se muestra según los permisos de plataforma; el backend los valida siempre.
        const perms = me.platform?.permissions ?? [];
        this.isOperator.set(perms.includes('platform.billing.operate') || perms.includes('platform.plans.manage'));
      }),
    );
  }

  chooseTenant(id: number): Observable<TenantRef> {
    this.tenantId.set(id);
    this.tenant.set(null);
    this.permissions.set([]);
    return this.http.get<TenantRef>(`${this.hostUrl}/tenants/current`).pipe(
      switchMap(tenant => this.loadPermissions().pipe(
        tap(() => { this.tenant.set(tenant); this.persist(); }),
        map(() => tenant),
      )),
      catchError(error => {
        this.tenantId.set(null);
        this.tenant.set(null);
        this.permissions.set([]);
        this.persist();
        return throwError(() => error);
      }),
    );
  }

  loadPermissions(): Observable<{ permissions: string[]; provider_id?: number | null; delegated?: boolean }> {
    return this.http.get<{ permissions: string[]; provider_id?: number | null; delegated?: boolean }>(
      `${this.hostUrl}/auth/permissions`).pipe(
      tap(response => {
        this.permissions.set(response.permissions);
        this.providerId.set(response.provider_id ?? null);
        this.delegatedAccess.set(response.delegated === true);
      }),
    );
  }

  hasPermission(code: string): boolean { return this.permissions().includes(code); }

  /**
   * Restaura la sesión guardada al arrancar la app (tras recargar la página).
   * Nunca lanza: si algo falla, la app arranca sin sesión.
   */
  async restore(): Promise<void> {
    const stored = this.readStorage();
    if (!stored || stored.expiresAt <= Date.now()) {
      this.clearStorage();
      return;
    }
    this.accessToken.set(stored.token);
    this.expiresAt = stored.expiresAt;
    try {
      await firstValueFrom(this.loadMe());
      if (stored.tenantId !== null && this.me()?.tenants.includes(stored.tenantId)) {
        await firstValueFrom(this.chooseTenant(stored.tenantId));
      }
      this.scheduleRefresh();
    } catch {
      this.clearSession();
    }
  }

  /** Cierre por expiración o revocación (401 del backend). */
  expireSession(): void {
    if (this.accessToken() === null) return;
    this.endedReason.set('expired');
    this.clearSession();
    void this.router.navigateByUrl('/login');
  }

  logout(): void {
    this.endedReason.set(null);
    this.clearSession();
    void this.router.navigateByUrl('/login');
  }

  // ---------------------------------------------------------------- internos

  private setToken(token: string, expiresInSeconds: number): void {
    this.accessToken.set(token);
    this.expiresAt = Date.now() + Math.max(60, expiresInSeconds) * 1000;
    this.persist();
    this.scheduleRefresh();
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const delay = Math.max(5_000, this.expiresAt - Date.now() - REFRESH_MARGIN_MS);
    this.refreshTimer = setTimeout(() => void this.refresh(), delay);
  }

  private async refresh(): Promise<void> {
    if (this.accessToken() === null) return;
    try {
      const r = await firstValueFrom(this.http.post<LoginResponse>(`${this.hostUrl}/auth/refresh`, {}));
      this.setToken(r.access_token, r.expires_in);
    } catch {
      // 401 (sesión vencida o revocada): el interceptor ya cerró la sesión.
    }
  }

  private clearSession(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
    this.accessToken.set(null);
    this.expiresAt = 0;
    this.me.set(null);
    this.tenantId.set(null);
    this.tenant.set(null);
    this.permissions.set([]);
    this.isOperator.set(false);
    this.clearStorage();
  }

  private persist(): void {
    const token = this.accessToken();
    if (token === null) return;
    const value: StoredSession = { token, tenantId: this.tenantId(), expiresAt: this.expiresAt };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* almacenamiento no disponible */ }
  }

  private readStorage(): StoredSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (typeof parsed.token !== 'string' || typeof parsed.expiresAt !== 'number') return null;
      return { token: parsed.token, expiresAt: parsed.expiresAt,
               tenantId: typeof parsed.tenantId === 'number' ? parsed.tenantId : null };
    } catch {
      return null;
    }
  }

  private clearStorage(): void {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* sin almacenamiento */ }
  }
}
