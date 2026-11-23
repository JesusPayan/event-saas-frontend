
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';
import { InventoryCategory } from '../../models/inventory.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inventory-categories',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="space-y-6 p-4 md:p-6">
      <div>
        <a routerLink="/inventory" class="text-sm font-medium">← Volver al inventario</a>
        <h1 class="page-title mt-2">Categorías de inventario</h1>
        <p class="page-subtitle">Agrupa tus artículos para encontrarlos y reportarlos más fácil.</p>
      </div>

      @if (error()) {
        <p class="alert-error" role="alert">{{ error() }}</p>
      }

      <div class="grid gap-6 lg:grid-cols-3">
        @if (auth.hasPermission(editingId() === null ? 'inventory.create' : 'inventory.update')) {
          <form #form="ngForm" (ngSubmit)="save()" class="card h-fit space-y-5">
            <h2 class="text-lg font-semibold text-gray-900">{{ editingId() === null ? 'Nueva categoría' : 'Editar categoría' }}</h2>
            <div>
              <label for="cat-name" class="form-label">Nombre <span class="text-red-600">*</span></label>
              <input id="cat-name" name="name" class="form-control" [(ngModel)]="name" required maxlength="120" />
            </div>
            <div>
              <label for="cat-description" class="form-label">Descripción</label>
              <input id="cat-description" name="description" class="form-control" [(ngModel)]="description" maxlength="255" />
            </div>
            <div class="flex flex-wrap justify-end gap-3">
              @if (editingId() !== null) {
                <button type="button" class="btn-secondary" (click)="cancelEdit()">Cancelar</button>
              }
              <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
                {{ saving() ? 'Guardando...' : 'Guardar categoría' }}
              </button>
            </div>
          </form>
        }

        <div class="relative overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2" [attr.aria-busy]="loading()">
          <table class="w-full text-left text-sm text-gray-700">
            <thead class="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th scope="col" class="px-4 py-3">Nombre</th>
                <th scope="col" class="px-4 py-3">Descripción</th>
                <th scope="col" class="px-4 py-3"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (category of categories(); track category.id) {
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ category.name }}</td>
                  <td class="px-4 py-3">{{ category.description || '—' }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right">
                    @if (auth.hasPermission('inventory.update')) {
                      <button type="button" class="font-medium text-blue-700 hover:underline" (click)="edit(category)">Editar</button>
                      <button type="button" class="ml-4 font-medium text-red-700 hover:underline" (click)="confirmCategory.set(category)">Desactivar</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="3" class="px-4 py-10 text-center text-gray-500">{{ loading() ? 'Cargando categorías…' : 'No hay categorías registradas.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (confirmCategory(); as category) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cat-deactivate-title">
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="cat-deactivate-title" class="text-lg font-bold text-gray-900">¿Desactivar «{{ category.name }}»?</h2>
            <p class="mt-2 text-sm text-gray-600">La categoría dejará de ofrecerse al registrar artículos. Los artículos existentes no se modifican.</p>
            <div class="mt-6 flex justify-end gap-3">
              <button type="button" class="btn-secondary" (click)="confirmCategory.set(null)">Cancelar</button>
              <button type="button" class="btn-primary !bg-red-600 hover:!bg-red-700" (click)="deactivate(category)">Desactivar</button>
            </div>
          </div>
        </div>
      }
    </section>
  `
})
export class InventoryCategoriesComponent implements OnInit {
  private readonly service = inject(InventoryService);

  readonly auth = inject(AuthService);
  readonly categories = signal<InventoryCategory[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly editingId = signal<number | null>(null);
  readonly confirmCategory = signal<InventoryCategory | null>(null);

  name = '';
  description = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.categories()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: data => this.categories.set(data),
        error: () => this.error.set('No se pudieron cargar las categorías.')
      });
  }

  edit(category: InventoryCategory): void {
    this.editingId.set(category.id);
    this.name = category.name;
    this.description = category.description ?? '';
    this.error.set('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.name = '';
    this.description = '';
  }

  save(): void {
    if (this.saving()) return;

    this.error.set('');

    const payload = {
      name: this.name.trim(),
      description: this.description.trim()
    };

    if (!payload.name) {
      this.error.set('El nombre es obligatorio.');
      return;
    }

    const id = this.editingId();

    const request$ = id === null
      ? this.service.createCategory(payload)
      : this.service.updateCategory(id, payload);

    this.saving.set(true);

    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.load();
        },
        error: err => {
          this.error.set(
            err.status === 409
              ? 'Ya existe una categoría con ese nombre.'
              : 'No se pudo guardar la categoría.'
          );
        }
      });
  }

  deactivate(category: InventoryCategory): void {
    this.confirmCategory.set(null);

    this.service.deactivateCategory(category.id)
      .subscribe({
        next: () => this.load(),
        error: () => {
          this.error.set('No se pudo desactivar la categoría.');
        }
      });
  }
}
