
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

import { ClientsService } from '../../../services/clients.service';
import { Client } from '../../../models/client.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-detail.component.html'
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
