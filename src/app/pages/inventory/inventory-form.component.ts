
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { InventoryService } from '../../services/inventory.service';

import {
  InventoryCategory,
  InventoryPayload
} from '../../models/inventory.model';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="form-page">
      <a routerLink="/inventory">← Volver al inventario</a>

      <h1>
        {{ editing() ? 'Editar artículo' : 'Nuevo artículo' }}
      </h1>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (loading()) {
        <p>Cargando información...</p>
      } @else {
        <form #form="ngForm" (ngSubmit)="save()">

          <label>
            SKU
            <input
              name="sku"
              [(ngModel)]="model.sku"
              required
              maxlength="60"
            />
          </label>

          <label>
            Nombre
            <input
              name="name"
              [(ngModel)]="model.name"
              required
              maxlength="180"
            />
          </label>

          <label>
            Categoría
            <select
              name="category_id"
              [(ngModel)]="model.category_id">

              <option [ngValue]="null">
                Sin categoría
              </option>

              @for (category of categories(); track category.id) {
                <option [ngValue]="category.id">
                  {{ category.name }}
                </option>
              }
            </select>
          </label>

          <label>
            Tipo
            <select
              name="item_type"
              [(ngModel)]="model.item_type"
              required>
              <option value="product">Producto</option>
              <option value="service">Servicio</option>
            </select>
          </label>

          <label>
            Existencias
            <input
              name="quantity_total"
              type="number"
              min="0"
              required
              [(ngModel)]="model.quantity_total"
            />
          </label>

          <label>
            Unidad de medida
            <select
              name="unit"
              [(ngModel)]="model.unit"
              required>
              <option value="piece">Pieza</option>
              <option value="set">Juego</option>
              <option value="table">Mesa</option>
              <option value="chair">Silla</option>
              <option value="service">Servicio</option>
            </select>
          </label>

          <label>
            Costo de reposición
            <input
              name="replacement_cost"
              type="number"
              min="0"
              step="0.01"
              [(ngModel)]="model.replacement_cost"
            />
          </label>

          <label>
            Precio de renta
            <input
              name="rental_price"
              type="number"
              min="0"
              step="0.01"
              [(ngModel)]="model.rental_price"
            />
          </label>

          <label>
            Descripción
            <textarea
              name="description"
              [(ngModel)]="model.description"
              rows="4">
            </textarea>
          </label>

          <div class="actions">
            <a routerLink="/inventory">Cancelar</a>

            <button
              type="submit"
              [disabled]="form.invalid || saving()">
              {{ saving() ? 'Guardando...' : 'Guardar artículo' }}
            </button>
          </div>
        </form>
      }
    </main>
  `,
  styles: [`
    .form-page {
      max-width: 850px;
      margin: auto;
      padding: 24px;
    }

    form {
      display: grid;
      gap: 16px;
      margin-top: 24px;
    }

    label {
      display: grid;
      gap: 6px;
      font-weight: 500;
    }

    input, select, textarea {
      padding: 11px;
      border: 1px solid #bbb;
      border-radius: 8px;
      font: inherit;
    }

    .actions {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    button {
      padding: 12px 18px;
      cursor: pointer;
    }

    .error {
      color: #b42318;
    }
  `]
})
export class InventoryFormComponent implements OnInit {
  private readonly service = inject(InventoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = signal<InventoryCategory[]>([]);
  readonly editing = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  private itemId: number | null = null;

  model: InventoryPayload = {
    category_id: null,
    sku: '',
    name: '',
    description: '',
    item_type: 'product',
    quantity_total: 0,
    unit: 'piece',
    replacement_cost: null,
    rental_price: null
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id !== null) {
      const parsed = Number(id);

      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        this.error.set('Identificador de artículo inválido.');
        return;
      }

      this.itemId = parsed;
      this.editing.set(true);
    }

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    if (this.itemId !== null) {
      forkJoin({
        categories: this.service.categories(),
        item: this.service.getById(this.itemId)
      })
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: result => {
            this.categories.set(result.categories);
            this.model = {
              category_id: result.item.category_id,
              sku: result.item.sku,
              name: result.item.name,
              description: result.item.description,
              item_type: result.item.item_type,
              quantity_total: result.item.quantity_total,
              unit: result.item.unit,
              replacement_cost: result.item.replacement_cost,
              rental_price: result.item.rental_price
            };
          },
          error: () => {
            this.error.set('No se pudo cargar el artículo.');
          }
        });
    } else {
      this.service.categories()
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: categories => this.categories.set(categories),
          error: () => {
            this.error.set('No se pudieron cargar las categorías.');
          }
        });
    }
  }

  save(): void {
    if (this.saving() || this.loading()) return;

    this.error.set('');

    if (!this.model.sku.trim() || !this.model.name.trim()) {
      this.error.set('SKU y nombre son obligatorios.');
      return;
    }

    if (
      !Number.isInteger(this.model.quantity_total) ||
      this.model.quantity_total < 0
    ) {
      this.error.set('Las existencias deben ser un entero no negativo.');
      return;
    }

    const request$ = this.itemId !== null
      ? this.service.update(this.itemId, this.model)
      : this.service.create(this.model);

    this.saving.set(true);

    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/inventory']);
        },
        error: err => {
          if (err.status === 409) {
            this.error.set('El SKU ya existe o hay un conflicto de datos.');
          } else if (err.status === 403) {
            this.error.set('No tienes permiso para guardar artículos.');
          } else if (err.status === 400) {
            this.error.set('Revisa los datos del formulario.');
          } else {
            this.error.set('No se pudo guardar el artículo.');
          }
        }
      });
  }
}
