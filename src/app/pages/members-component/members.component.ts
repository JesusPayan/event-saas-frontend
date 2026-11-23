import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';

interface Member { id: number; user_id: number; role_id: number; status: string; email?: string | null; role_name?: string | null; }

const ROLE_LABELS: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', member: 'Miembro' };

@Component({ standalone: true, imports: [PageHeaderComponent], templateUrl: './members.component.html' })
export class MembersComponent {
  private readonly http = inject(HttpClient);
  readonly members = signal<Member[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.http.get<{ items: Member[] }>('/api/v1/memberships').subscribe({
      next: r => { this.members.set(r.items); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los miembros.'); this.loading.set(false); },
    });
  }

  roleLabel(m: Member): string {
    return m.role_name ? (ROLE_LABELS[m.role_name] ?? m.role_name) : `Rol #${m.role_id}`;
  }
}
