import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CatalogService, FULFILLMENT_LABELS, FulfillmentType, PRICING_LABELS, PricingMode, Provider }
  from '../../../services/catalog.service';
import { Category, PlatformService } from '../../../services/platform.service';
import { InventoryService } from '../../../services/inventory.service';
import { InventoryItem } from '../../../models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

const ERRORS: Record<string, string> = {
  unit_price_required: 'Indica el precio o elige «Bajo cotización».',
  inventory_item_required: 'Elige el artículo de inventario que consume esta oferta.',
  invalid_guest_range: 'El mínimo de invitados no puede ser mayor que el máximo.',
  category_not_found: 'Elige una categoría vigente.',
  provider_not_found: 'El proveedor no existe o está inactivo.',
  invalid_duration_hours: 'La duración debe estar entre 0.25 y 240 horas.',
};

interface OfferForm {
  name: string; description: string; category_id: number | null; provider_id: number | null;
  status: string; pricing_mode: PricingMode; unit_price: string; fulfillment_type: FulfillmentType;
  inventory_item_id: number | null; duration_hours: string; min_guests: number | null; max_guests: number | null;
  coverage: string; min_notice_days: number | null; setup_requirements: string; daily_capacity: number | null;
  requires_provider_confirmation: boolean; venue_restrictions: string; required_documents: string;
  shared: boolean;
}

/** CAT-01: alta y edición de una oferta del catálogo. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, RouterLink],
  templateUrl: './catalog-offer-form.component.html' })
export class CatalogOfferFormComponent {
  private readonly catalog = inject(CatalogService);
  private readonly platform = inject(PlatformService);
  private readonly inventory = inject(InventoryService);
  private readonly router = inject(Router);
  readonly offerId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly categories = signal<Category[]>([]);
  readonly providers = signal<Provider[]>([]);
  readonly inventoryItems = signal<InventoryItem[]>([]);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly pricingLabels = PRICING_LABELS;
  readonly fulfillmentLabels = FULFILLMENT_LABELS;
  readonly pricingModes = Object.keys(PRICING_LABELS) as PricingMode[];
  readonly fulfillmentTypes = Object.keys(FULFILLMENT_LABELS) as FulfillmentType[];
  readonly categoryId = signal<number | null>(null);
  readonly selectedCategory = computed(() => this.categories().find(c => c.id === this.categoryId()) ?? null);
  readonly special = computed(() => {
    const c = this.selectedCategory();
    if (!c) return false;
    const root = this.categories().find(r => r.id === c.parent_id);
    return c.requires_special_permits || !!root?.requires_special_permits;
  });
  form: OfferForm = {
    name: '', description: '', category_id: null, provider_id: null, status: 'published', pricing_mode: 'per_event',
    unit_price: '', fulfillment_type: 'manual', inventory_item_id: null, duration_hours: '', min_guests: null,
    max_guests: null, coverage: '', min_notice_days: null, setup_requirements: '', daily_capacity: null,
    requires_provider_confirmation: false, venue_restrictions: '', required_documents: '', shared: false,
  };

  constructor() {
    firstValueFrom(this.platform.categories()).then(r => this.categories.set(r.items)).catch(() => undefined);
    firstValueFrom(this.catalog.providers()).then(r => this.providers.set(r.items.filter(p => p.status === 'active')))
      .catch(() => undefined);
    firstValueFrom(this.inventory.list(1, 100, '')).then(r => this.inventoryItems.set(r.items.filter(i => i.is_active)))
      .catch(() => undefined);
    if (this.offerId) void this.loadOffer(this.offerId);
  }

  label(c: Category): string {
    const parent = this.categories().find(p => p.id === c.parent_id);
    return parent ? `${parent.name} › ${c.name}` : c.name;
  }

  onCategory(id: number | null): void {
    this.form.category_id = id;
    this.categoryId.set(id);
  }

  private async loadOffer(id: number): Promise<void> {
    try {
      const { offer } = await firstValueFrom(this.catalog.offer(id));
      this.form = {
        name: offer.name, description: offer.description ?? '', category_id: offer.category_id,
        provider_id: offer.provider_id, status: offer.status, pricing_mode: offer.pricing_mode,
        unit_price: offer.unit_price ?? '', fulfillment_type: offer.fulfillment_type,
        inventory_item_id: offer.inventory_item_id, duration_hours: offer.duration_hours ?? '',
        min_guests: offer.min_guests ?? null, max_guests: offer.max_guests ?? null, coverage: offer.coverage ?? '',
        min_notice_days: offer.min_notice_days ?? null, setup_requirements: offer.setup_requirements ?? '',
        daily_capacity: offer.daily_capacity ?? null,
        requires_provider_confirmation: offer.requires_provider_confirmation ?? false,
        venue_restrictions: offer.venue_restrictions ?? '', required_documents: offer.required_documents ?? '',
        shared: offer.shared ?? false,
      };
      this.categoryId.set(offer.category_id);
    } catch {
      this.error.set('No se encontró la oferta.');
    }
  }

  private payload(): Record<string, unknown> {
    const f = this.form;
    const text = (v: string) => v.trim() || null;
    const num = (v: number | null) => (v === null || v === undefined || `${v}` === '' ? null : Number(v));
    return {
      name: f.name.trim(), description: text(f.description), category_id: f.category_id,
      provider_id: f.provider_id, status: f.status, pricing_mode: f.pricing_mode,
      unit_price: f.pricing_mode === 'quote' ? null : (f.unit_price === '' ? null : Number(f.unit_price).toFixed(2)),
      fulfillment_type: f.fulfillment_type,
      inventory_item_id: f.fulfillment_type === 'inventory' ? f.inventory_item_id : null,
      duration_hours: f.duration_hours === '' ? null : Number(f.duration_hours).toFixed(2),
      min_guests: num(f.min_guests), max_guests: num(f.max_guests), coverage: text(f.coverage),
      min_notice_days: num(f.min_notice_days), setup_requirements: text(f.setup_requirements),
      daily_capacity: f.fulfillment_type === 'schedule' ? num(f.daily_capacity) : null,
      requires_provider_confirmation: f.requires_provider_confirmation,
      venue_restrictions: text(f.venue_restrictions), required_documents: text(f.required_documents),
      shared: f.shared,
    };
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      if (this.offerId) await firstValueFrom(this.catalog.updateOffer(this.offerId, this.payload()));
      else await firstValueFrom(this.catalog.createOffer(this.payload()));
      await this.router.navigate(['/catalog']);
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? err.error?.error : '';
      this.error.set(ERRORS[code] ?? 'No fue posible guardar la oferta. Revisa los datos.');
    } finally {
      this.saving.set(false);
    }
  }
}
