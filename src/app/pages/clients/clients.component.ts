
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ClientsService } from '../../services/clients.service';
import { Client } from '../../models/client.model';
import { AuthService } from '../../services/auth.service';
@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="panel">
      <header>
        <h1>Clientes</h1>
        <p>Administra los clientes de tu empresa.</p>
      </header>

      <div class="toolbar">
        <input
          type="search"
          placeholder="Buscar clientes..."
          [(ngModel)]="search"
          (keyup.enter)="load(1)"
        />

        <button (click)="load(1)">
          Buscar
        </button>

        <a routerLink="/clients/new">
          + Nuevo cliente
        </a>
      </div>

      @if (error()) {
        <p class="error" role="alert">
          {{ error() }}
        </p>
      }

      @if (loading()) {
        <p>Cargando clientes...</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            @for (client of clients(); track client.id) {
              <tr>
                <td>
                  {{ client.first_name }}
                  {{ client.last_name }}
                </td>
                <td>{{ client.email || '-' }}</td>
                <td>{{ client.phone || '-' }}</td>
                <td>{{ client.status }}</td>
                <td>
                  <a [routerLink]="['/clients', client.id]">
                    Ver detalle
                  </a>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">
                  No hay clientes registrados.
                </td>
              </tr>
            }
          </tbody>
        </table>

        <p>Total: {{ total() }}</p>

        <div class="toolbar">
          <button
            [disabled]="page() <= 1"
            (click)="load(page() - 1)"
          >
            Anterior
          </button>

          <span>Página {{ page() }}</span>

          <button
            [disabled]="page() * 20 >= total()"
            (click)="load(page() + 1)"
          >
            Siguiente
          </button>
        </div>
      }
    </section>
    @if (auth.hasPermission('clients.create')) {
  <a routerLink="/clients/new">
    + Nuevo cliente
  </a>
}
  `
})
export class ClientsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private service = inject(ClientsService);

  clients = signal<Client[]>([]);
  loading = signal(false);
  error = signal('');
  total = signal(0);
  page = signal(1);

  search = '';

  ngOnInit(): void {
    this.load();
  }

  load(page = 1): void {
    this.loading.set(true);
    this.error.set('');

    this.service.getAll(page, this.search)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.clients.set(response.items);
          this.total.set(response.total);
          this.page.set(response.page);
        },
        error: () => {
          this.error.set('No se pudieron cargar los clientes.');
        }
      });
  }
}
