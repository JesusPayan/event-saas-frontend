
import {
  Component,
  computed,
  inject,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { QuotesService } from '../../../services/quotes';

import { AuthService } from '../../../services/auth.service';
import { distinctUntilChanged, finalize } from 'rxjs';
import { ClientsService } from '../../../services/clients.service';
import { EventsService } from '../../../services/events.service';
import { Client } from '../../../models/client.model';
import { Event } from '../../../models/event.model';
import { InventoryService } from '../../../services/inventory.service';
import { InventoryItem } from '../../../models/inventory.model';
import { CatalogEntry, CatalogService, PRICING_LABELS, PricingMode } from '../../../services/catalog.service';
import { Category, PlatformService } from '../../../services/platform.service';


type CreateQuotePayload = Parameters<QuotesService['createQuote']>[0];
@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './quote-form.html'
})

export class QuoteForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly quotesService = inject(QuotesService);
  private readonly router = inject(Router);

  readonly auth = inject(AuthService);

  readonly saving = signal(false);
  readonly error = signal('');
  private readonly clientsService = inject(ClientsService);
  private readonly eventsService = inject(EventsService);

  readonly clients = signal<Client[]>([]);
  readonly events = signal<Event[]>([]);

  readonly loadingClients = signal(false);
  readonly loadingEvents = signal(false);

  readonly clientSearch = signal('');
  readonly eventSearch = signal('');

  readonly clientPage = signal(1);
  readonly hasMoreClients = signal(false);


  readonly inventoryItems = signal<InventoryItem[]>([]);
  readonly loadingInventory = signal(false);

  private readonly inventoryService = inject(InventoryService);


  readonly inventoryError = signal('');

  // CAT-01: catálogo de productos y servicios
  private readonly catalogService = inject(CatalogService);
  private readonly platformService = inject(PlatformService);
  readonly catalogCategories = signal<Category[]>([]);
  readonly catalogResults = signal<CatalogEntry[]>([]);
  readonly catalogLoading = signal(false);
  readonly catalogCategory = signal<number | null>(null);
  readonly catalogSearch = signal('');
  readonly pricingLabels = PRICING_LABELS;

  loadCatalog(): void {
    this.catalogLoading.set(true);
    this.catalogService.offers({ categoryId: this.catalogCategory(), search: this.catalogSearch().trim(),
                                 publishedOnly: true })
      .pipe(finalize(() => this.catalogLoading.set(false)))
      .subscribe({
        next: r => this.catalogResults.set(r.items),
        error: () => this.catalogResults.set([]),
      });
  }

  categoryLabel(c: Category): string {
    const parent = this.catalogCategories().find(p => p.id === c.parent_id);
    return parent ? `${parent.name} › ${c.name}` : c.name;
  }

  pricingLabel(mode: string | null | undefined): string {
    return mode ? (PRICING_LABELS[mode as PricingMode] ?? mode) : '';
  }

  quantityLabel(index: number): string {
    const mode = this.items.at(index).get('pricing_mode')?.value as string | null;
    if (mode === 'per_person') return 'Personas *';
    if (mode === 'per_hour') return 'Horas *';
    return 'Cantidad *';
  }

  /** Agrega mobiliario o un servicio del catálogo como partida de la misma solicitud. */
  addFromCatalog(entry: CatalogEntry): void {
    const first = this.items.at(0)?.value;
    if (this.items.length === 1 && !first.description && !first.offer_id && !first.inventory_item_id) {
      this.items.removeAt(0);
    }
    const group = this.createItem();
    const guests = this.events().find(e => e.id === this.form.controls.event_id.value)?.estimated_guests ?? null;
    let quantity = 1;
    if (entry.pricing_mode === 'per_person') quantity = guests ?? entry.min_guests ?? 1;
    if (entry.pricing_mode === 'per_hour') quantity = Number(entry.duration_hours ?? 1) || 1;
    if (entry.kind === 'inventory') {
      group.patchValue({
        item_type: 'inventory', inventory_item_id: entry.id, description: entry.name,
        unit_price: entry.unit_price !== null ? Number(entry.unit_price) : 0, quantity,
        category_name: entry.category_name ?? '', provider_name: 'Mi empresa', pricing_mode: 'unit',
      });
      if (!this.inventoryItems().some(i => i.id === entry.id)) {
        this.inventoryItems.update(list => [...list, { id: entry.id, name: entry.name, sku: entry.sku ?? '',
          rental_price: entry.unit_price, is_active: true } as unknown as InventoryItem]);
      }
    } else {
      group.patchValue({
        item_type: entry.fulfillment_type === 'inventory' ? 'inventory' : 'service',
        offer_id: entry.id, description: entry.name, pricing_mode: entry.pricing_mode,
        price_pending: entry.price_pending, unit_price: entry.price_pending ? 0 : Number(entry.unit_price ?? 0),
        provider_name: entry.provider_name ?? 'Mi empresa', category_name: entry.category_name ?? '',
        requires_permits: entry.requires_special_permits || !!entry.venue_restrictions || !!entry.required_documents,
        needs_confirmation: entry.fulfillment_type !== 'inventory', quantity,
      });
    }
    this.items.push(group);
  }

  get pendingCount(): number {
    return this.items.controls.filter(c => c.value.price_pending).length;
  }

  readonly inventorySearch = signal('');
  readonly inventoryPage = signal(1);
  readonly inventoryTotal = signal(0);
  readonly inventoryHasMore = computed(
  () => this.inventoryPage() * 20 < this.inventoryTotal()
);


loadInventory(page = 1, search = ''): void {
  this.loadingInventory.set(true);
  this.inventoryError.set('');

  this.inventoryService.list(page, 20, search)
    .pipe(
      finalize(() => this.loadingInventory.set(false))
    )
    .subscribe({
      next: response => {
        const activeItems = response.items.filter(
          item => item.is_active
        );

        this.inventoryItems.update(current =>
          page === 1
            ? activeItems
            : [
                ...current,
                ...activeItems.filter(
                  item => !current.some(
                    existing => existing.id === item.id
                  )
                )
              ]
        );

        this.inventoryPage.set(response.page);
        this.inventoryTotal.set(response.total);
      },
      error: err => {
        console.error('Error loading inventory:', err);

        this.inventoryError.set(
          'No se pudo cargar el inventario.'
        );
      }
    });
}

onInventorySearch(value: string): void {
  this.inventorySearch.set(value);
  this.loadInventory(1, value);
}

loadMoreInventory(): void {
  if (
    this.loadingInventory() ||
    this.inventoryPage() * 20 >= this.inventoryTotal()
  ) {
    return;
  }

  this.loadInventory(
    this.inventoryPage() + 1,
    this.inventorySearch()
  );
}


onInventorySelected(index: number): void {
  const control = this.items.at(index);

  const inventoryId = Number(
    control.get('inventory_item_id')?.value
  );

  const selected = this.inventoryItems().find(
    inventory => inventory.id === inventoryId
  );

  if (!selected) {
    return;
  }

  control.patchValue({
    inventory_item_id: selected.id,
    description: selected.description?.trim() || selected.name,
    unit_price: selected.rental_price !== null
      ? Number(selected.rental_price)
      : 0
  });
}


  ngOnInit(): void {
    this.loadClients();
    this.loadInventory();
    this.platformService.categories().subscribe({ next: r => this.catalogCategories.set(r.items) });
    this.loadCatalog();
    this.form.controls.client_id.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(clientId => {
        this.form.controls.event_id.setValue(null);
        this.events.set([]);
        this.eventSearch.set('');

        if (clientId) {
          this.loadEvents(clientId);
        }
      });
  }


  readonly form = this.fb.group({
    client_id: [null as number | null, [
      Validators.required,
      Validators.min(1)
    ]],
    event_id: [null as number | null, [
      Validators.required,
      Validators.min(1)
    ]],
    currency: ['MXN', Validators.required],
    valid_until: [''],
    notes: [''],
    terms_conditions: [''],
    items: this.fb.array([
      this.createItem()
    ])
  });

  get items(): FormArray {
    return this.form.controls.items;
  }

  private createItem() {
    return this.fb.group({
      item_type: ['custom', Validators.required],
      inventory_item_id: [null as number | null],
      description: ['', Validators.required],
      quantity: [1, [
        Validators.required,
        Validators.min(0.01)
      ]],
      unit_price: [0, [
        Validators.required,
        Validators.min(0)
      ]],
      discount_amount: [0, Validators.min(0)],
      tax_rate: [0, [
        Validators.required,
        Validators.min(0),
        Validators.max(100)
      ]],
      // CAT-01: datos de la oferta del catálogo (solo informativos en el formulario).
      offer_id: [null as number | null],
      pricing_mode: [null as string | null],
      price_pending: [false],
      provider_name: [''],
      category_name: [''],
      requires_permits: [false],
      needs_confirmation: [false],
      service_notes: ['']
    });
  }

  addItem(): void {
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    if (this.items.length <= 1) {
      return;
    }

    this.items.removeAt(index);
  }

  lineSubtotal(index: number): number {
    const item = this.items.at(index).value;

    // Bajo cotización: no suma hasta acordar el importe.
    if (item.price_pending) {
      return 0;
    }

    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unit_price ?? 0);

    return this.round(quantity * unitPrice);
  }

  lineDiscount(index: number): number {
    const item = this.items.at(index).value;
    return Number(item.discount_amount ?? 0);
  }

  lineTax(index: number): number {
    const item = this.items.at(index).value;

    const base = Math.max(
      0,
      this.lineSubtotal(index) - this.lineDiscount(index)
    );

    return this.round(
      base * Number(item.tax_rate ?? 0) / 100
    );
  }

  lineTotal(index: number): number {
    return this.round(
      this.lineSubtotal(index)
      - this.lineDiscount(index)
      + this.lineTax(index)
    );
  }

  get subtotal(): number {
    return this.round(
      this.items.controls.reduce(
        (sum, _, index) => sum + this.lineSubtotal(index),
        0
      )
    );
  }

  get discountTotal(): number {
    return this.round(
      this.items.controls.reduce(
        (sum, _, index) => sum + this.lineDiscount(index),
        0
      )
    );
  }

  get taxTotal(): number {
    return this.round(
      this.items.controls.reduce(
        (sum, _, index) => sum + this.lineTax(index),
        0
      )
    );
  }

  get total(): number {
    return this.round(
      this.subtotal - this.discountTotal + this.taxTotal
    );
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private validItems(): boolean {
    return this.items.controls.every((control, index) => {
      const item = control.value;
      const subtotal = this.lineSubtotal(index);
      const discount = this.lineDiscount(index);

      if (discount < 0 || discount > subtotal) {
        return false;
      }

      if (
        item.item_type === 'inventory' && !item.offer_id &&
        (!item.inventory_item_id ||
          Number(item.inventory_item_id) <= 0)
      ) {
        return false;
      }

      return true;
    });
  }

  save(): void {
    if (this.saving()) return;

    if (!this.auth.hasPermission('quotes.create')) {
      this.error.set(
        'No tienes permisos para crear cotizaciones.'
      );
      return;
    }

    if (this.form.invalid || !this.validItems()) {
      this.form.markAllAsTouched();
      this.error.set(
        'Revisa los campos obligatorios, descuentos y conceptos.'
      );
      return;
    }

    this.error.set('');

    const value = this.form.getRawValue();

    const items: CreateQuotePayload['items'] = value.items.map(item => {
      if (item.offer_id) {
        const offerItem: CreateQuotePayload['items'][number] = {
          offer_id: Number(item.offer_id),
          description: item.description ?? '',
          quantity: String(item.quantity ?? 0),
          discount_amount: String(item.price_pending ? 0 : item.discount_amount ?? 0),
          tax_rate: String(Number(item.tax_rate ?? 0) / 100),
        };
        if (!item.price_pending) offerItem.unit_price = String(item.unit_price ?? 0);
        if (item.pricing_mode === 'per_person') offerItem.guests = Number(item.quantity);
        if (item.pricing_mode === 'per_hour') offerItem.hours = Number(item.quantity);
        if (item.service_notes?.trim()) offerItem.service_notes = item.service_notes.trim();
        return offerItem;
      }
      return {
        item_type: item.item_type as CreateQuotePayload['items'][number]['item_type'],
        inventory_item_id:
          item.item_type === 'inventory'
            ? Number(item.inventory_item_id)
            : null,
        description: item.description ?? '',
        quantity: String(item.quantity ?? 0),
        unit_price: String(item.unit_price ?? 0),
        discount_amount: String(item.discount_amount ?? 0),
        tax_rate: String(Number(item.tax_rate ?? 0) / 100)
      };
    });

    

const payload: CreateQuotePayload = {
  client_id: Number(value.client_id),
  event_id: Number(value.event_id),
  valid_until: value.valid_until || null,
  notes: value.notes?.trim() || null,
  terms_conditions:
    value.terms_conditions?.trim() || null,
  items
};



    this.saving.set(true);

    this.quotesService.createQuote(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: quote => {
          this.router.navigate(['/quotes', quote.id]);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error creating quote:', err);

          
if (err.status === 400 || err.status === 422) {
  const details = err.error?.details;

  if (details && typeof details === 'object') {
    const fields = Object.entries(details)
      .map(([field, message]) => `${field}: ${message}`)
      .join(', ');

    this.error.set(
      `Error de validación: ${fields}`
    );
  } else {
    this.error.set(
      'El servidor rechazó los datos de la cotización.'
    );
  }
}
 else if (err.status === 401) {
            this.error.set('Tu sesión ha expirado.');
          } else if (err.status === 403) {
            this.error.set(
              'No tienes permisos para crear cotizaciones.'
            );
          } else {
            this.error.set(
              `No se pudo guardar la cotización (${err.status}).`
            );
          }
        }
      });
  }

  loadClients(page = 1, search = ''): void {
    this.loadingClients.set(true);

    this.clientsService.getAll(page, search, 'active')
      .pipe(finalize(() => this.loadingClients.set(false)))
      .subscribe({
        next: response => {
          const items = response.items;

          this.clients.update(current =>
            page === 1 ? items : [...current, ...items]
          );

          this.clientPage.set(page);
          this.hasMoreClients.set(page * 20 < response.total);
        },
        error: err => {
          console.error('Error loading clients:', err);
          this.error.set('No se pudieron cargar los clientes.');
        }
      });
  }

  loadMoreClients(): void {
    if (!this.hasMoreClients() || this.loadingClients()) {
      return;
    }

    this.loadClients(
      this.clientPage() + 1,
      this.clientSearch()
    );
  }

  onClientSearch(value: string): void {
    this.clientSearch.set(value);
    this.clients.set([]);
    this.loadClients(1, value);
  }

  onClientChange(value: number | null): void {
    this.form.patchValue({
      client_id: value,
      event_id: null
    });

    this.events.set([]);
    this.eventSearch.set('');

    if (value) {
      this.loadEvents(value);
    }
  }

  loadEvents(clientId: number, search = ''): void {
    this.loadingEvents.set(true);

    this.eventsService.list({
      client_id: clientId,
      search,
      page: 1,
      per_page: 100
    })
      .pipe(finalize(() => this.loadingEvents.set(false)))
      .subscribe({
        next: response => {
          this.events.set(
            response.items.filter(
              event => event.client_id === clientId
            )
          );
        },
        error: err => {
          console.error('Error loading events:', err);
          this.error.set('No se pudieron cargar los eventos.');
        }
      });
  }

  onEventSearch(value: string): void {
    this.eventSearch.set(value);

    const clientId = this.form.controls.client_id.value;

    if (clientId) {
      this.loadEvents(clientId, value);
    }
  }

}
