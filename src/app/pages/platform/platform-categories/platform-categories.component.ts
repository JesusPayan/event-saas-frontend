import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { Category, PlatformService } from '../../../services/platform.service';

const ERRORS: Record<string, string> = {
  invalid_name: 'Escribe un nombre de hasta 120 caracteres.',
  max_depth_two_levels: 'Solo se admiten categorías y subcategorías (dos niveles).',
  furniture_category_required: '«Renta de mobiliario» no se puede desactivar: agrupa el inventario.',
};

/** CAT-01: categorías globales del catálogo, con subcategorías, sin publicar versión. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule],
  templateUrl: './platform-categories.component.html' })
export class PlatformCategoriesComponent {
  private readonly platform = inject(PlatformService);
  readonly items = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly editing = signal<Category | null>(null);
  readonly roots = computed(() => this.items().filter(c => c.parent_id === null));
  form = { name: '', parent_id: null as number | null, description: '', requires_special_permits: false };
  editForm = { name: '', description: '' };

  constructor() { void this.load(); }

  children(id: number): Category[] { return this.items().filter(c => c.parent_id === id); }

  private fail(err: unknown, fallback: string): void {
    const code = err instanceof HttpErrorResponse ? err.error?.error : '';
    this.error.set(ERRORS[code] ?? fallback);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.items.set((await firstValueFrom(this.platform.categories(true))).items);
    } catch {
      this.error.set('No se pudieron cargar las categorías.');
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const r = await firstValueFrom(this.platform.createCategory({
        name: this.form.name.trim(), parent_id: this.form.parent_id,
        description: this.form.description.trim() || null,
        requires_special_permits: this.form.requires_special_permits }));
      this.message.set(`«${r.category.name}» ya está disponible para todas las organizaciones.`);
      this.form = { name: '', parent_id: null, description: '', requires_special_permits: false };
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible crear la categoría.');
    } finally {
      this.busy.set(false);
    }
  }

  startEdit(c: Category): void {
    this.editForm = { name: c.name, description: c.description ?? '' };
    this.editing.set(c);
  }

  async saveEdit(): Promise<void> {
    const c = this.editing();
    if (!c) return;
    await this.update(c, { name: this.editForm.name.trim(), description: this.editForm.description.trim() || null });
    this.editing.set(null);
  }

  async toggle(c: Category): Promise<void> {
    await this.update(c, { is_active: !c.is_active });
  }

  private async update(c: Category, body: Parameters<PlatformService['updateCategory']>[1]): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await firstValueFrom(this.platform.updateCategory(c.id, body));
      this.message.set('Categoría actualizada.');
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible actualizar la categoría.');
    } finally {
      this.busy.set(false);
    }
  }
}
