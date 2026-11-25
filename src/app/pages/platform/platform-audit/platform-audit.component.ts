import { Component, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { AuditEvent, PlatformService } from '../../../services/platform.service';

const ACTION_LABELS: Record<string, string> = {
  'platform_role.grant': 'Rol de plataforma asignado', 'platform_role.revoke': 'Rol de plataforma retirado',
  'platform_role.invite': 'Invitación a rol de plataforma', 'platform_role.invite_revoke': 'Invitación cancelada',
  'platform_owner.transfer': 'Propiedad transferida', 'organization.create': 'Organización creada',
  'organization.suspend': 'Organización suspendida', 'organization.activate': 'Organización reactivada',
  'organization.referred': 'Alta por referido', 'access_grant.create': 'Acceso temporal concedido',
  'access_grant.revoke': 'Acceso temporal revocado', 'delegated_access.use': 'Consulta con acceso delegado',
  'member.invite': 'Miembro invitado', 'member.join': 'Miembro aceptó invitación',
  'member.role_change': 'Cambio de rol', 'member.activate': 'Miembro reactivado',
  'member.deactivate': 'Miembro desactivado', 'catalog_category.create': 'Categoría creada',
  'catalog_category.update': 'Categoría actualizada',
};

/** ROLES-01: bitácora de acciones sensibles (actor, acción, alcance y fecha). */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, DatePipe, JsonPipe],
  templateUrl: './platform-audit.component.html' })
export class PlatformAuditComponent {
  private readonly platform = inject(PlatformService);
  readonly items = signal<AuditEvent[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly actions = Object.entries(ACTION_LABELS);
  action = '';
  tenantId: number | null = null;

  constructor() { void this.load(); }

  label(action: string): string { return ACTION_LABELS[action] ?? action; }

  async load(page = 1): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.platform.audit(page, this.action, this.tenantId || null));
      this.items.set(r.items);
      this.total.set(r.total);
      this.page.set(r.page);
    } catch {
      this.error.set('No se pudo cargar la auditoría.');
    } finally {
      this.loading.set(false);
    }
  }
}
