import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { PlatformService, ROLE_LABELS, RolesResponse, RoleAssignment, PlatformInvitation } from '../../../services/platform.service';

const ERRORS: Record<string, string> = {
  invalid_email: 'Correo no válido.',
  role_already_assigned: 'Esa persona ya tiene ese rol.',
  owner_requires_transfer: 'El rol de dueño solo cambia con «Transferir propiedad».',
  role_not_enabled: 'Ese rol todavía no está habilitado.',
  forbidden: 'Tu rol no permite gestionar ese rol.',
  invitation_already_pending: 'Ya hay una invitación pendiente para ese correo y rol.',
  user_not_found: 'No hay una cuenta activa con ese correo.',
  cannot_transfer_to_self: 'Elige a otra persona.',
};
const ROLE_HELP: Record<string, string> = {
  platform_admin: 'Da de alta organizaciones, gestiona su estado, atiende incidencias y administra promotores.',
  promoter: 'Registra prospectos y comparte su enlace de referido. No ve datos de las organizaciones.',
};

type Pending = { kind: 'revoke'; row: RoleAssignment } | { kind: 'revoke-invite'; inv: PlatformInvitation }
  | { kind: 'transfer' };

/** ROLES-01: asignación de roles de plataforma con alcance global. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, DatePipe],
  templateUrl: './platform-roles.component.html' })
export class PlatformRolesComponent {
  private readonly platform = inject(PlatformService);
  readonly auth = inject(AuthService);
  readonly data = signal<RolesResponse | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly inviteUrl = signal<string | null>(null);
  readonly pending = signal<Pending | null>(null);
  readonly labels = ROLE_LABELS;
  readonly help = ROLE_HELP;
  readonly reserved = ['support', 'finance', 'auditor'];
  readonly assignable = computed(() => this.data()?.assignable ?? []);
  email = '';
  role = 'promoter';
  transferEmail = '';
  keepAdmin = true;

  constructor() { void this.load(); }

  private fail(err: unknown, fallback: string): void {
    const code = err instanceof HttpErrorResponse ? err.error?.error : '';
    this.error.set(ERRORS[code] ?? fallback);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.platform.roles());
      this.data.set(r);
      if (!r.assignable.includes(this.role)) this.role = r.assignable[0] ?? 'promoter';
    } catch {
      this.error.set('No se pudieron cargar los roles.');
    } finally {
      this.loading.set(false);
    }
  }

  canRevoke(row: RoleAssignment): boolean {
    return row.role !== 'platform_owner' && this.assignable().includes(row.role);
  }

  isSelf(row: RoleAssignment): boolean { return row.user_id === this.auth.me()?.id; }

  async grant(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.inviteUrl.set(null);
    try {
      const r = await firstValueFrom(this.platform.grantRole(this.email.trim(), this.role));
      if (r.invited) {
        this.message.set(r.email_sent ? `Enviamos una invitación a ${this.email.trim()}: aún no tenía cuenta.`
          : 'La persona no tenía cuenta y no pudimos enviar el correo. Comparte este enlace:');
        this.inviteUrl.set(r.email_sent ? null : r.invite_url ?? null);
      } else {
        this.message.set(`Rol asignado a ${this.email.trim()}.`);
      }
      this.email = '';
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible asignar el rol.');
    } finally {
      this.busy.set(false);
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
        await firstValueFrom(this.platform.revokeRole(action.row.id));
        this.message.set(`Se retiró el rol a ${action.row.email}.`);
      } else if (action.kind === 'revoke-invite') {
        await firstValueFrom(this.platform.revokeInvitation(action.inv.id));
        this.message.set('Invitación cancelada.');
      } else {
        const r = await firstValueFrom(this.platform.transferOwner(this.transferEmail.trim(), this.keepAdmin));
        this.message.set(`La propiedad de la plataforma ahora es de ${r.new_owner_email}.`);
        await firstValueFrom(this.auth.loadMe());
      }
      this.pending.set(null);
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible completar la acción.');
    } finally {
      this.busy.set(false);
    }
  }
}
