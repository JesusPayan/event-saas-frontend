
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { InventoryItem } from '../../models/inventory.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="inventory-page">
      <header>
        <div>
          <h1>Inventario</h1>
          <p>Administra los artículos y servicios de tu empresa.</p>
        </div>

        @if (auth.hasPermission('inventory.create')) {
          <a routerLink="/inventory/new">+ Nuevo artículo</a>
        }
        <a routerLink="/inventory/categories">
            Administrar categorías
        </a>
      </header>

      <div class="filters">
        <input
          [(ngModel)]="search"
          placeholder="Buscar por nombre o SKU"
          (keyup.enter)="load(1)"
        />
        <button type="button" (click)="load(1)">Buscar</button>
      </div>

      @if (loading()) {
        <p>Cargando inventario...</p>
      }

      @if (error()) {
        <p role="alert" class="error">{{ error() }}</p>
      }

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Artículo</th>
            <th>Tipo</th>
            <th>Existencias</th>
            <th>Precio renta</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          @for (item of items(); track item.id) {
            <tr>
              <td>{{ item.sku }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.item_type }}</td>
              <td>{{ item.quantity_total }} {{ item.unit }}</td>
              <td>{{ item.rental_price ?? '—' }}</td>
              <td>{{ item.is_active ? 'Activo' : 'Inactivo' }}</td>
              <td>
                @if (auth.hasPermission('inventory.update')) {
                  <a [routerLink]="['/inventory', item.id, 'edit']">
                    Editar
                  </a>
                }
                @if (auth.hasPermission('inventory.update') && item.is_active) {
                <button
                    type="button"
                    (click)="deactivate(item)">
                    Desactivar
                </button>
}
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7">No hay artículos registrados.</td>
            </tr>
          }
        </tbody>
      </table>

      <footer>
        <span>Total: {{ total() }}</span>

        <button
          type="button"
          [disabled]="page() <= 1 || loading()"
          (click)="load(page() - 1)">
          Anterior
        </button>

        <span>Página {{ page() }} de {{ pages() || 1 }}</span>

        <button
          type="button"
          [disabled]="page() >= pages() || loading()"
          (click)="load(page() + 1)">
          Siguiente
        </button>
      </footer>
    </main>
  `,
  styles: [`
    .inventory-page { padding: 24px; }
    header, .filters, footer {
      display: flex; justify-content: space-between;
      align-items: center; gap: 16px; margin-bottom: 20px;
    }
    input { padding: 10px; min-width: 240px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; border-bottom: 1px solid #ddd; }
    th { text-align: left; }
    button { padding: 8px 14px; cursor: pointer; }
    .error { color: #b42318; }
  `]
})
export class InventoryComponent implements OnInit {
  private readonly service = inject(InventoryService);
  readonly auth = inject(AuthService);

  readonly items = signal<InventoryItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');

  search = '';

  ngOnInit(): void {
    this.load();
  }

  deactivate(item: InventoryItem): void {
  if (!this.auth.hasPermission('inventory.update')) return;

  if (!window.confirm(
    `¿Desactivar el artículo "${item.name}"?`
  )) return;

  this.service.deactivate(item.id).subscribe({
    next: () => this.load(this.page()),
    error: () => {
      this.error.set('No se pudo desactivar el artículo.');
    }
  });
}
  load(page = 1): void {
    this.loading.set(true);
    this.error.set('');

    this.service.list(page, 20, this.search)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.page.set(result.page);
          this.pages.set(result.pages);
        },
        error: err => {
          console.error(err);
          this.error.set('No se pudo cargar el inventario.');
        }
      });
  }
}
