
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { finalize } from 'rxjs';

import { ClientsService } from '../../services/clients.service';
import { Client } from '../../models/client.model';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="panel">

      <a routerLink="/clients">← Volver a clientes</a>

      @if (loading()) {
        <p>Cargando cliente...</p>
      }

      @if (error()) {
        <p role="alert" class="error">{{ error() }}</p>
      }

      @if (client(); as c) {
        <h1>
          {{ c.client_type === 'business' && c.business_name
            ? c.business_name
            : c.first_name + ' ' + (c.last_name ?? '') }}
        </h1>

        <p>Estado: {{ c.status }}</p>

        <h2>Información general</h2>

        <dl>
          <dt>Tipo</dt>
          <dd>{{ c.client_type }}</dd>

          <dt>Nombre de contacto</dt>
          <dd>{{ c.first_name }} {{ c.last_name }}</dd>

          <dt>Correo</dt>
          <dd>{{ c.email || 'Sin registrar' }}</dd>

          <dt>Teléfono</dt>
          <dd>{{ c.phone || 'Sin registrar' }}</dd>

          <dt>WhatsApp</dt>
          <dd>{{ c.whatsapp || 'Sin registrar' }}</dd>

          <dt>Dirección</dt>
          <dd>{{ c.address || 'Sin registrar' }}</dd>

          <dt>Ciudad</dt>
          <dd>{{ c.city || 'Sin registrar' }}</dd>

          <dt>Estado / Provincia</dt>
          <dd>{{ c.state || 'Sin registrar' }}</dd>

          <dt>Observaciones</dt>
          <dd>{{ c.notes || 'Sin observaciones' }}</dd>
        </dl>

        @if (auth.hasPermission('clients.update')) {
          <div class="form-actions">
            <a [routerLink]="['/clients', c.id, 'edit']">
              Editar cliente
            </a>

            @if (c.status === 'active') {
              <button
                type="button"
                [disabled]="busy()"
                (click)="deactivate()">
                Desactivar cliente
              </button>
            }
          </div>
        }
      }
    </section>
  `
})
export class ClientDetailComponent implements OnInit {
  private readonly service = inject(ClientsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly auth = inject(AuthService);

  readonly client = signal<Client | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  private id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isSafeInteger(this.id) || this.id <= 0) {
      this.error.set('Identificador inválido.');
      return;
    }

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.getById(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: client => this.client.set(client),
        error: () => this.error.set('Cliente no encontrado.')
      });
  }

  deactivate(): void {
    if (this.busy() || !this.auth.hasPermission('clients.update')) {
      return;
    }

    if (!window.confirm('¿Desactivar este cliente?')) {
      return;
    }

    this.busy.set(true);
    this.error.set('');

    this.service.deactivate(this.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: client => this.client.set(client),
        error: () => {
          this.error.set('No se pudo desactivar el cliente.');
        }
      });
  }
}
