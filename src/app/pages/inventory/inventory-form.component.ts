
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
    <section class="space-y-6 p-4 md:p-6">
      <div>
        <a routerLink="/inventory" class="text-sm font-medium">← Volver al inventario</a>
        <h1 class="page-title mt-2">{{ editing() ? 'Editar artículo' : 'Nuevo artículo' }}</h1>
        <p class="page-subtitle">Datos del artículo, existencias y precios de renta.</p>
      </div>

      @if (error()) {
        <p class="alert-error" role="alert">{{ error() }}</p>
      }

      @if (loading()) {
        <div class="card space-y-4" aria-busy="true">
          @for (i of [1, 2, 3, 4]; track i) { <div class="h-10 animate-pulse rounded-lg bg-gray-100"></div> }
        </div>
      } @else {
        <form #form="ngForm" (ngSubmit)="save()" class="card space-y-8">

          <fieldset>
            <legend class="mb-4 text-base font-semibold text-gray-900">Identificación</legend>
            <div class="grid gap-5 md:grid-cols-3">
              <div>
                <label for="sku" class="form-label">SKU <span class="text-red-600">*</span></label>
                <input id="sku" name="sku" class="form-control" [(ngModel)]="model.sku" required maxlength="60" placeholder="SILLA-TIFFANY-01" />
              </div>
              <div class="md:col-span-2">
                <label for="name" class="form-label">Nombre <span class="text-red-600">*</span></label>
                <input id="name" name="name" class="form-control" [(ngModel)]="model.name" required maxlength="180" />
              </div>
              <div>
                <label for="category_id" class="form-label">Categoría</label>
                <select id="category_id" name="category_id" class="form-control" [(ngModel)]="model.category_id">
                  <option [ngValue]="null">Sin categoría</option>
                  @for (category of categories(); track category.id) {
                    <option [ngValue]="category.id">{{ category.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="item_type" class="form-label">Tipo <span class="text-red-600">*</span></label>
                <select id="item_type" name="item_type" class="form-control" [(ngModel)]="model.item_type" required>
                  <option value="product">Producto</option>
                  <option value="service">Servicio</option>
                </select>
              </div>
              <div>
                <label for="unit" class="form-label">Unidad de medida <span class="text-red-600">*</span></label>
                <select id="unit" name="unit" class="form-control" [(ngModel)]="model.unit" required>
                  <option value="piece">Pieza</option>
                  <option value="set">Juego</option>
                  <option value="table">Mesa</option>
                  <option value="chair">Silla</option>
                  <option value="service">Servicio</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend class="mb-4 text-base font-semibold text-gray-900">Existencias y precios</legend>
            <div class="grid gap-5 md:grid-cols-3">
              <div>
                <label for="quantity_total" class="form-label">Existencias <span class="text-red-600">*</span></label>
                <input id="quantity_total" name="quantity_total" type="number" min="0" required class="form-control" [(ngModel)]="model.quantity_total" />
              </div>
              <div>
                <label for="replacement_cost" class="form-label">Costo de reposición (MXN)</label>
                <input id="replacement_cost" name="replacement_cost" type="number" min="0" step="0.01" class="form-control" [(ngModel)]="model.replacement_cost" placeholder="0.00" />
                <p class="form-hint">Se usa para cobrar daños o pérdidas.</p>
              </div>
              <div>
                <label for="rental_price" class="form-label">Precio de renta (MXN)</label>
                <input id="rental_price" name="rental_price" type="number" min="0" step="0.01" class="form-control" [(ngModel)]="model.rental_price" placeholder="0.00" />
              </div>
            </div>
          </fieldset>

          <div>
            <label for="description" class="form-label">Descripción</label>
            <textarea id="description" name="description" class="form-control" [(ngModel)]="model.description" rows="4"></textarea>
          </div>

          <div class="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
            <a routerLink="/inventory" class="btn-secondary">Cancelar</a>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Guardando...' : 'Guardar artículo' }}
            </button>
          </div>
        </form>
      }
    </section>
  `
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
