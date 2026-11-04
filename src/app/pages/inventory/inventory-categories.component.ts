
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
    <main class="categories-page">
      <a routerLink="/inventory">← Volver al inventario</a>
      <h1>Categorías de inventario</h1>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (auth.hasPermission(
        editingId() === null ? 'inventory.create' : 'inventory.update'
      )) {
        <form #form="ngForm" (ngSubmit)="save()">
          <h2>
            {{ editingId() === null ? 'Nueva categoría' : 'Editar categoría' }}
          </h2>

          <label>
            Nombre
            <input
              name="name"
              [(ngModel)]="name"
              required
              maxlength="120"
            />
          </label>

          <label>
            Descripción
            <input
              name="description"
              [(ngModel)]="description"
              maxlength="255"
            />
          </label>

          <button type="submit"
                  [disabled]="form.invalid || saving()">
            {{ saving() ? 'Guardando...' : 'Guardar categoría' }}
          </button>

          @if (editingId() !== null) {
            <button type="button" (click)="cancelEdit()">
              Cancelar edición
            </button>
          }
        </form>
      }

      <h2>Categorías registradas</h2>

      @if (loading()) {
        <p>Cargando categorías...</p>
      }

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          @for (category of categories(); track category.id) {
            <tr>
              <td>{{ category.name }}</td>
              <td>{{ category.description || '—' }}</td>
              <td>
                @if (auth.hasPermission('inventory.update')) {
                  <button type="button"
                          (click)="edit(category)">
                    Editar
                  </button>

                  <button type="button"
                          (click)="deactivate(category)">
                    Desactivar
                  </button>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="3">No hay categorías registradas.</td>
            </tr>
          }
        </tbody>
      </table>
    </main>
  `,
  styles: [`
    .categories-page { padding: 24px; max-width: 1100px; margin: auto; }
    form {
      display: grid; gap: 12px; padding: 20px;
      border: 1px solid #ddd; border-radius: 12px;
      margin: 24px 0;
    }
    label { display: grid; gap: 6px; }
    input { padding: 10px; border: 1px solid #aaa; border-radius: 7px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
    button { margin-right: 8px; padding: 8px 12px; cursor: pointer; }
    .error { color: #b42318; }
  `]
})
export class InventoryCategoriesComponent implements OnInit {
  private readonly service = inject(InventoryService);

  readonly auth = inject(AuthService);
  readonly categories = signal<InventoryCategory[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly editingId = signal<number | null>(null);

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
    if (!window.confirm(
      `¿Desactivar la categoría "${category.name}"?`
    )) return;

    this.service.deactivateCategory(category.id)
      .subscribe({
        next: () => this.load(),
        error: () => {
          this.error.set('No se pudo desactivar la categoría.');
        }
      });
  }
}
