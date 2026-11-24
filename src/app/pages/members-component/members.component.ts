import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';

interface Member { id: number; user_id: number; role_id: number; status: string; email?: string | null; role_name?: string | null; }
interface Invitation { id: number; email: string; role: string; status: string; expired: boolean; created_at: string | null; expires_at: string | null; }
interface InviteResult { invitation: Invitation; invite_url: string; email_sent: boolean; }

export const ROLE_OPTIONS = [
  { key: 'admin', label: 'Administrador', help: 'Todo, excepto contratar o cancelar la suscripción.' },
  { key: 'staff', label: 'Operativo', help: 'Clientes, eventos, cotizaciones, contratos e inventario. Sin miembros ni cobros por daños.' },
  { key: 'viewer', label: 'Solo lectura', help: 'Consulta información sin modificarla.' },
];
const ROLE_LABELS: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', staff: 'Operativo', viewer: 'Solo lectura' };

const ERRORS: Record<string, string> = {
  invalid_email: 'Correo no válido.',
  invalid_role: 'Rol no válido.',
  already_member: 'Esa persona ya es miembro de la empresa.',
  invitation_already_pending: 'Ya hay una invitación pendiente para ese correo.',
  cannot_modify_self: 'No puedes cambiar tu propio rol ni desactivarte.',
  cannot_modify_owner: 'El propietario no se puede modificar.',
  billing_entitlement_denied: 'Alcanzaste el límite de usuarios de tu plan (incluye invitaciones pendientes).',
  status_unchanged: 'El miembro ya estaba en ese estado.',
};

type Pending = { kind: 'deactivate' | 'activate'; member: Member } | { kind: 'revoke'; invitation: Invitation };

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
  inviteEmail = '';
  inviteRole = 'staff';

  constructor() {
    void this.load();
  }

  roleLabel(m: Member): string {
    return m.role_name ? (ROLE_LABELS[m.role_name] ?? m.role_name) : `Rol #${m.role_id}`;
  }

  roleName(key: string): string { return ROLE_LABELS[key] ?? key; }

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
    } catch {
      this.error.set('No se pudieron cargar los miembros.');
    } finally {
      this.loading.set(false);
    }
  }

  openInvite(): void {
    this.inviteEmail = '';
    this.inviteRole = 'staff';
    this.lastInvite.set(null);
    this.error.set('');
    this.inviteOpen.set(true);
  }

  async sendInvite(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await firstValueFrom(this.http.post<InviteResult>('/api/v1/invitations',
        { email: this.inviteEmail.trim(), role: this.inviteRole }));
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
    try {
      await firstValueFrom(this.http.patch(`/api/v1/memberships/${m.id}`, { role }));
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
