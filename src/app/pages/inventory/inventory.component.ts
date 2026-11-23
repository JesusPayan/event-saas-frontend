
import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { InventoryItem } from '../../models/inventory.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe, PageHeaderComponent],
  template: `
    <section class="space-y-6 p-4 md:p-6">
      <app-page-header title="Inventario" description="Artículos y servicios disponibles para tus eventos.">
        <a routerLink="/inventory/categories" class="btn-secondary">Categorías</a>
        @if (auth.hasPermission('inventory.create')) {
          <a routerLink="/inventory/new" class="btn-primary">+ Nuevo artículo</a>
        }
      </app-page-header>

      <form class="flex flex-col gap-3 sm:flex-row" (ngSubmit)="load(1)">
        <label for="inv-search" class="sr-only">Buscar</label>
        <input id="inv-search" name="search" class="form-control sm:max-w-md" [(ngModel)]="search" placeholder="Buscar por nombre o SKU" />
        <button type="submit" class="btn-secondary" [disabled]="loading()">Buscar</button>
      </form>

      @if (error()) {
        <p role="alert" class="alert-error">{{ error() }}</p>
      }

      <div class="relative overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm" [attr.aria-busy]="loading()">
        <table class="w-full text-left text-sm text-gray-700">
          <thead class="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th scope="col" class="px-4 py-3">SKU</th>
              <th scope="col" class="px-4 py-3">Artículo</th>
              <th scope="col" class="px-4 py-3">Tipo</th>
              <th scope="col" class="px-4 py-3 text-right">Existencias</th>
              <th scope="col" class="px-4 py-3 text-right">Precio renta</th>
              <th scope="col" class="px-4 py-3">Estado</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="whitespace-nowrap px-4 py-3 font-mono text-xs">{{ item.sku }}</td>
                <td class="px-4 py-3 font-medium text-gray-900">{{ item.name }}</td>
                <td class="px-4 py-3">{{ item.item_type === 'service' ? 'Servicio' : 'Producto' }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right">{{ item.quantity_total }} {{ unitLabel(item.unit) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right">{{ item.rental_price != null ? (item.rental_price | currency:'MXN':'symbol-narrow':'1.2-2') : '—' }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" [class]="item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'">
                    {{ item.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right">
                  @if (auth.hasPermission('inventory.update')) {
                    <a [routerLink]="['/inventory', item.id, 'edit']" class="font-medium">Editar</a>
                    @if (item.is_active) {
                      <button type="button" class="ml-4 font-medium text-red-700 hover:underline" (click)="confirmItem.set(item)">Desactivar</button>
                    }
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-4 py-10 text-center text-gray-500">{{ loading() ? 'Cargando inventario…' : 'No hay artículos registrados.' }}</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="flex flex-col items-center justify-between gap-3 text-sm text-gray-600 sm:flex-row">
        <span>{{ total() }} artículos</span>
        <div class="flex items-center gap-2">
          <button type="button" class="btn-secondary px-3 py-1.5" [disabled]="page() <= 1 || loading()" (click)="load(page() - 1)">Anterior</button>
          <span>Página {{ page() }} de {{ pages() || 1 }}</span>
          <button type="button" class="btn-secondary px-3 py-1.5" [disabled]="page() >= pages() || loading()" (click)="load(page() + 1)">Siguiente</button>
        </div>
      </div>

      @if (confirmItem(); as item) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="inv-deactivate-title">
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="inv-deactivate-title" class="text-lg font-bold text-gray-900">¿Desactivar «{{ item.name }}»?</h2>
            <p class="mt-2 text-sm text-gray-600">Dejará de poder reservarse para nuevos eventos. Las reservas y movimientos existentes se conservan.</p>
            <div class="mt-6 flex justify-end gap-3">
              <button type="button" class="btn-secondary" (click)="confirmItem.set(null)">Cancelar</button>
              <button type="button" class="btn-primary !bg-red-600 hover:!bg-red-700" (click)="deactivate(item)">Desactivar</button>
            </div>
          </div>
        </div>
      }
    </section>
  `
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
  readonly confirmItem = signal<InventoryItem | null>(null);

  search = '';

  ngOnInit(): void {
    this.load();
  }

  deactivate(item: InventoryItem): void {
  if (!this.auth.hasPermission('inventory.update')) return;

  this.confirmItem.set(null);

  this.service.deactivate(item.id).subscribe({
    next: () => this.load(this.page()),
    error: () => {
      this.error.set('No se pudo desactivar el artículo.');
    }
  });
}
  unitLabel(unit: string): string {
    const labels: Record<string, string> = { piece: 'pzas', set: 'juegos', table: 'mesas', chair: 'sillas', service: 'serv.' };
    return labels[unit] ?? unit;
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
        error: () => {
          this.error.set('No se pudo cargar el inventario.');
        }
      });
  }
}
