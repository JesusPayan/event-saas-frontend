import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { CatalogEntry, CatalogService, FULFILLMENT_LABELS } from '../../../services/catalog.service';
import { Category, PlatformService } from '../../../services/platform.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

/** CAT-01: catálogo de productos y servicios de la organización. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './catalog-list.component.html' })
export class CatalogListComponent {
  private readonly catalog = inject(CatalogService);
  private readonly platform = inject(PlatformService);
  readonly auth = inject(AuthService);
  readonly categories = signal<Category[]>([]);
  readonly items = signal<CatalogEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selected = signal<number | null>(null);
  readonly roots = computed(() => this.categories().filter(c => c.parent_id === null));
  readonly subcategories = computed(() => {
    const id = this.selected();
    const current = this.categories().find(c => c.id === id);
    const rootId = current?.parent_id ?? id;
    return rootId ? this.categories().filter(c => c.parent_id === rootId) : [];
  });
  readonly fulfillmentLabels = FULFILLMENT_LABELS;
  readonly canManage = computed(() => this.auth.hasPermission('catalog.manage'));
  /** NET-01: mi catálogo o el de la red (ofertas compartidas por otras organizaciones). */
  readonly source = signal<'mine' | 'network'>('mine');
  search = '';
  status = '';

  setSource(source: 'mine' | 'network'): void {
    this.source.set(source);
    void this.load();
  }

  constructor() {
    firstValueFrom(this.platform.categories()).then(r => this.categories.set(r.items)).catch(() => undefined);
    void this.load();
  }

  pick(id: number | null): void {
    this.selected.set(id);
    void this.load();
  }

  isActive(id: number): boolean {
    const current = this.categories().find(c => c.id === this.selected());
    return this.selected() === id || current?.parent_id === id;
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const r = this.source() === 'network'
        ? await firstValueFrom(this.catalog.network({ categoryId: this.selected(), search: this.search.trim() }))
        : await firstValueFrom(this.catalog.offers({
          categoryId: this.selected(), search: this.search.trim(), status: this.status }));
      this.items.set(r.items);
    } catch {
      this.error.set('No se pudo cargar el catálogo.');
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(s: string): string {
    return ({ draft: 'Borrador', published: 'Publicado', archived: 'Archivado' } as Record<string, string>)[s] ?? s;
  }
}
