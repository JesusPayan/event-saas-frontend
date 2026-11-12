
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ClientsService } from '../../../services/clients.service';
import {
  ClientPayload,
  ClientType
} from '../../../models/client.model';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './client-form.component.html'
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
