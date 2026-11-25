import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { CatalogService, Provider } from '../../services/catalog.service';
import { AccessGrant, PlatformService } from '../../services/platform.service';

interface Member { id: number; user_id: number; role_id: number; status: string; email?: string | null; role_name?: string | null; provider_id?: number | null; }
interface Invitation { id: number; email: string; role: string; status: string; expired: boolean; created_at: string | null; expires_at: string | null; provider_id?: number | null; }
interface InviteResult { invitation: Invitation; invite_url: string; email_sent: boolean; }

export const ROLE_OPTIONS = [
  { key: 'admin', label: 'Administrador', help: 'Todo, excepto contratar o cancelar la suscripción.' },
  { key: 'staff', label: 'Operativo', help: 'Clientes, eventos, cotizaciones, contratos e inventario. Sin miembros ni cobros por daños.' },
  { key: 'viewer', label: 'Solo lectura', help: 'Consulta información sin modificarla.' },
  { key: 'provider', label: 'Proveedor', help: 'Proveedor externo: solo ve y confirma sus propias partidas.' },
];
const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario', admin: 'Administrador', staff: 'Operativo', viewer: 'Solo lectura', provider: 'Proveedor',
};
const PURPOSE_LABELS: Record<string, string> = { support: 'Soporte de plataforma', training: 'Capacitación (promotor)' };

const ERRORS: Record<string, string> = {
  invalid_email: 'Correo no válido.',
  invalid_role: 'Rol no válido.',
  already_member: 'Esa persona ya es miembro de la empresa.',
  invitation_already_pending: 'Ya hay una invitación pendiente para ese correo.',
  cannot_modify_self: 'No puedes cambiar tu propio rol ni desactivarte.',
  cannot_modify_owner: 'El propietario no se puede modificar.',
  billing_entitlement_denied: 'Alcanzaste el límite de usuarios de tu plan (incluye invitaciones pendientes).',
  status_unchanged: 'El miembro ya estaba en ese estado.',
  provider_required: 'Elige el proveedor al que pertenece la persona.',
  provider_not_found: 'El proveedor no existe o está inactivo.',
  user_not_found: 'No hay una cuenta con ese correo. Pide a la persona que se registre primero.',
  grantee_not_platform_staff: 'Esa cuenta no pertenece al personal de la plataforma.',
  grantee_not_referring_promoter: 'Esa cuenta no es el promotor que refirió a tu empresa.',
  grant_already_active: 'Esa persona ya tiene un acceso temporal vigente.',
  cannot_grant_self: 'No puedes concederte acceso a ti mismo.',
  invalid_days: 'Elige entre 1 y 30 días.',
};

type Pending = { kind: 'deactivate' | 'activate'; member: Member } | { kind: 'revoke'; invitation: Invitation }
  | { kind: 'revoke-grant'; grant: AccessGrant };

@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, DatePipe], templateUrl: './members.component.html' })
export class MembersComponent {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly members = signal<Member[]>([]);
  readonly invitations = signal<Invitation[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly inviteOpen = signal(false);
  readonly lastInvite = signal<InviteResult | null>(null);
  readonly pending = signal<Pending | null>(null);
  readonly canManage = computed(() => this.auth.hasPermission('members.manage'));
  readonly roleOptions = ROLE_OPTIONS;
  private readonly catalog = inject(CatalogService);
  private readonly platform = inject(PlatformService);
  readonly providers = signal<Provider[]>([]);
  readonly grants = signal<AccessGrant[]>([]);
  readonly grantOpen = signal(false);
  readonly purposeLabels = PURPOSE_LABELS;
  inviteEmail = '';
  inviteRole = 'staff';
  inviteProvider: number | null = null;
  grantEmail = '';
  grantPurpose: 'support' | 'training' = 'support';
  grantDays = 3;
  grantReason = '';

  constructor() {
    void this.load();
  }

  roleLabel(m: Member): string {
    return m.role_name ? (ROLE_LABELS[m.role_name] ?? m.role_name) : `Rol #${m.role_id}`;
  }

  roleName(key: string): string { return ROLE_LABELS[key] ?? key; }

  /** El rol de proveedor se asigna desde la invitación (requiere elegir proveedor). */
  inlineRoles(m: Member) {
    return this.roleOptions.filter(r => r.key !== 'provider' || m.role_name === 'provider');
  }

  providerName(id: number | null | undefined): string {
    return this.providers().find(p => p.id === id)?.name ?? '';
  }

  openGrant(): void {
    this.grantEmail = '';
    this.grantPurpose = 'support';
    this.grantDays = 3;
    this.grantReason = '';
    this.error.set('');
    this.grantOpen.set(true);
  }

  async saveGrant(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.platform.createAccessGrant({
        email: this.grantEmail.trim(), purpose: this.grantPurpose, days: Number(this.grantDays),
        reason: this.grantReason.trim() || null,
      }));
      this.grantOpen.set(false);
      this.message.set('Acceso temporal concedido. Queda registrado y puedes revocarlo cuando quieras.');
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible conceder el acceso.');
    } finally {
      this.busy.set(false);
    }
  }

  isSelf(m: Member): boolean { return m.user_id === this.auth.me()?.id; }

  editable(m: Member): boolean { return this.canManage() && !this.isSelf(m) && m.role_name !== 'owner'; }

  private fail(err: unknown, fallback: string): void {
    const code = err instanceof HttpErrorResponse ? err.error?.error : '';
    this.error.set(ERRORS[code] ?? fallback);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [members, invitations] = await Promise.all([
        firstValueFrom(this.http.get<{ items: Member[] }>('/api/v1/memberships')),
        firstValueFrom(this.http.get<{ items: Invitation[] }>('/api/v1/invitations')),
      ]);
      this.members.set(members.items);
      this.invitations.set(invitations.items);
      const [providers, grants] = await Promise.all([
        firstValueFrom(this.catalog.providers()).catch(() => ({ items: [] as Provider[] })),
        firstValueFrom(this.platform.accessGrants()).catch(() => ({ items: [] as AccessGrant[], max_days: 30 })),
      ]);
      this.providers.set(providers.items.filter(p => p.status === 'active'));
      this.grants.set(grants.items);
    } catch {
      this.error.set('No se pudieron cargar los miembros.');
    } finally {
      this.loading.set(false);
    }
  }

  openInvite(): void {
    this.inviteEmail = '';
    this.inviteRole = 'staff';
    this.inviteProvider = null;
    this.lastInvite.set(null);
    this.error.set('');
    this.inviteOpen.set(true);
  }

  async sendInvite(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await firstValueFrom(this.http.post<InviteResult>('/api/v1/invitations',
        this.inviteRole === 'provider'
          ? { email: this.inviteEmail.trim(), role: this.inviteRole, provider_id: Number(this.inviteProvider) }
          : { email: this.inviteEmail.trim(), role: this.inviteRole }));
      this.lastInvite.set(r);
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible enviar la invitación.');
    } finally {
      this.busy.set(false);
    }
  }

  async copyLink(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.message.set('Enlace copiado.');
    } catch {
      this.message.set('Copia el enlace manualmente.');
    }
  }

  async changeRole(m: Member, role: string): Promise<void> {
    this.error.set('');
    this.message.set('');
    const body: { role: string; provider_id?: number } =
      role === 'provider' && m.provider_id ? { role, provider_id: m.provider_id } : { role };
    try {
      await firstValueFrom(this.http.patch(`/api/v1/memberships/${m.id}`, body));
      this.message.set(`Rol de ${m.email} actualizado a ${this.roleName(role)}.`);
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible cambiar el rol.');
      await this.load();
    }
  }

  async confirm(): Promise<void> {
    const action = this.pending();
    if (!action) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      if (action.kind === 'revoke') {
        await firstValueFrom(this.http.post(`/api/v1/invitations/${action.invitation.id}/revoke`, {}));
        this.message.set('Invitación cancelada.');
      } else if (action.kind === 'revoke-grant') {
        await firstValueFrom(this.platform.revokeAccessGrant(action.grant.id));
        this.message.set('Acceso temporal revocado.');
      } else {
        await firstValueFrom(this.http.post(`/api/v1/memberships/${action.member.id}/${action.kind}`, {}));
        this.message.set(action.kind === 'deactivate' ? 'Acceso desactivado.' : 'Acceso reactivado.');
      }
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible completar la acción.');
    } finally {
      this.pending.set(null);
      this.busy.set(false);
    }
  }
}
