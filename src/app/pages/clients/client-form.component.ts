
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ClientsService } from '../../services/clients.service';
import {
  ClientPayload,
  ClientType
} from '../../models/client.model';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="panel">
      <h1>{{ editing() ? 'Editar cliente' : 'Nuevo cliente' }}</h1>
      <p>Información general y datos de contacto.</p>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (loading()) {
        <p>Cargando información...</p>
      } @else {
        <form #clientForm="ngForm" (ngSubmit)="save()">

          <label>
            Tipo de cliente
            <select
              name="client_type"
              [(ngModel)]="client.client_type">
              <option value="individual">Persona física</option>
              <option value="business">Empresa</option>
            </select>
          </label>

          <label>
            {{ client.client_type === 'business'
              ? 'Nombre de contacto'
              : 'Nombre' }}
            <input
              name="first_name"
              [(ngModel)]="client.first_name"
              required
              maxlength="100"
            />
          </label>

          <label>
            Apellidos
            <input
              name="last_name"
              [(ngModel)]="client.last_name"
              maxlength="150"
            />
          </label>

          @if (client.client_type === 'business') {
            <label>
              Razón social
              <input
                name="business_name"
                [(ngModel)]="client.business_name"
                required
                maxlength="180"
              />
            </label>
          }

          <label>
            Correo electrónico
            <input
              type="email"
              name="email"
              [(ngModel)]="client.email"
              email
              maxlength="180"
            />
          </label>

          <label>
            Teléfono
            <input
              type="tel"
              name="phone"
              [(ngModel)]="client.phone"
              maxlength="30"
            />
          </label>

          <label>
            WhatsApp
            <input
              type="tel"
              name="whatsapp"
              [(ngModel)]="client.whatsapp"
              maxlength="30"
            />
          </label>

          <label>
            Dirección
            <input
              name="address"
              [(ngModel)]="client.address"
              maxlength="255"
            />
          </label>

          <label>
            Ciudad
            <input
              name="city"
              [(ngModel)]="client.city"
              maxlength="100"
            />
          </label>

          <label>
            Estado
            <input
              name="state"
              [(ngModel)]="client.state"
              maxlength="100"
            />
          </label>

          <label>
            Código postal
            <input
              name="postal_code"
              [(ngModel)]="client.postal_code"
              maxlength="15"
            />
          </label>

          <label>
            Observaciones
            <textarea
              name="notes"
              [(ngModel)]="client.notes"
              rows="4">
            </textarea>
          </label>

          <div class="form-actions">
            <a routerLink="/clients">Cancelar</a>

            <button
              type="submit"
              [disabled]="busy() || clientForm.invalid">
              {{ busy() ? 'Guardando...' : 'Guardar cliente' }}
            </button>
          </div>
        </form>
      }
    </section>
  `
})
export class ClientFormComponent implements OnInit {
  private readonly service = inject(ClientsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly editing = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  private clientId: number | null = null;

  client: ClientPayload = this.emptyClient();

  private emptyClient(): ClientPayload {
    return {
      client_type: 'individual' as ClientType,
      first_name: '',
      last_name: '',
      business_name: '',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      notes: ''
    };
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) return;

    this.clientId = Number(id);

    if (!Number.isSafeInteger(this.clientId) || this.clientId <= 0) {
      this.error.set('Identificador de cliente inválido.');
      return;
    }

    this.editing.set(true);
    this.loading.set(true);

    this.service.getById(this.clientId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: data => {
          this.client = {
            client_type: data.client_type,
            first_name: data.first_name,
            last_name: data.last_name ?? '',
            business_name: data.business_name ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            whatsapp: data.whatsapp ?? '',
            address: data.address ?? '',
            city: data.city ?? '',
            state: data.state ?? '',
            postal_code: data.postal_code ?? '',
            notes: data.notes ?? ''
          };
        },
        error: () => {
          this.error.set('No se pudo cargar el cliente.');
        }
      });
  }

  save(): void {
    if (this.busy() || this.loading()) return;

    this.error.set('');

    if (!this.client.first_name.trim()) {
      this.error.set('El nombre es obligatorio.');
      return;
    }

    if (
      this.client.client_type === 'business' &&
      !this.client.business_name?.trim()
    ) {
      this.error.set('La razón social es obligatoria.');
      return;
    }

    this.busy.set(true);

    const request$ = this.editing() && this.clientId !== null
      ? this.service.update(this.clientId, this.client)
      : this.service.create(this.client);

    request$
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: result => {
          void this.router.navigate(['/clients', result.id]);
        },
        error: err => {
          console.error('Error guardando cliente:', err);

          if (err.status === 400) {
            this.error.set('Revisa los datos capturados.');
          } else if (err.status === 403) {
            this.error.set('No tienes permiso para guardar clientes.');
          } else {
            this.error.set('No se pudo guardar el cliente.');
          }
        }
      });
  }
}
