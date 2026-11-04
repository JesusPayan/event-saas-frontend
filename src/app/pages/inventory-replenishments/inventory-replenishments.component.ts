
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  InventoryReplenishmentsService,
  InventoryItemOption,
  Replenishment,
  Capacity
} from '../../services/inventory-replenishments.service';

@Component({
  selector: 'app-inventory-replenishments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './inventory-replenishments.component.html'
})
export class InventoryReplenishmentsComponent implements OnInit {

  private readonly service = inject(
    InventoryReplenishmentsService
  );

  // ============================================
  // ESTADO DE LA PANTALLA
  // ============================================

  readonly items = signal<InventoryItemOption[]>([]);
  readonly history = signal<Replenishment[]>([]);
  readonly capacity = signal<Capacity | null>(null);

  readonly loading = signal(false);
  readonly loadingHistory = signal(false);
  readonly saving = signal(false);

  readonly error = signal('');
  readonly success = signal('');

  // ============================================
  // FORMULARIO
  // ============================================

  selectedItemId: number | null = null;
  quantity: number | null = null;
  reason = '';
  reference = '';

  // ============================================
  // PAGINACIÓN
  // ============================================

  readonly currentPage = signal(1);
  readonly totalPages = signal(0);
  readonly totalRecords = signal(0);

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  ngOnInit(): void {
    this.loadItems();
  }

  // ============================================
  // ARTÍCULO SELECCIONADO
  // ============================================

  get selectedItem(): InventoryItemOption | null {
    return this.items().find(
      item => item.id === this.selectedItemId
    ) ?? null;
  }

  // ============================================
  // CARGAR ARTÍCULOS
  // ============================================

  loadItems(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.getItems().subscribe({
      next: response => {

        const items = Array.isArray(response)
          ? response
          : response.items ?? [];

        this.items.set(items);
        this.loading.set(false);
      },

      error: err => {
        console.error(
          'Error cargando inventario:',
          err
        );

        this.error.set(
          'No se pudo cargar el inventario.'
        );

        this.loading.set(false);
      }
    });
  }

  // ============================================
  // CAMBIO DE ARTÍCULO
  // ============================================

  onItemChange(): void {
    this.history.set([]);
    this.capacity.set(null);

    this.currentPage.set(1);
    this.totalPages.set(0);
    this.totalRecords.set(0);

    this.error.set('');
    this.success.set('');

    if (this.selectedItemId !== null) {
      this.loadHistory(1);
    }
  }

  // ============================================
  // CONSULTAR HISTORIAL
  // ============================================

  loadHistory(page = 1): void {

    const itemId = this.selectedItemId;

    if (itemId === null) {
      return;
    }

    this.loadingHistory.set(true);

    this.service.list(itemId, page).subscribe({

      next: response => {

        // Evita mostrar resultados de otro artículo
        // si el usuario cambió la selección.
        if (this.selectedItemId !== itemId) {
          return;
        }

        this.history.set(response.items ?? []);

        this.currentPage.set(response.page);
        this.totalPages.set(response.pages);
        this.totalRecords.set(response.total);

        this.loadingHistory.set(false);
      },

      error: err => {

        if (this.selectedItemId !== itemId) {
          return;
        }

        console.error(
          'Error consultando reposiciones:',
          err
        );

        this.error.set(
          'No se pudo consultar el historial de reposiciones.'
        );

        this.loadingHistory.set(false);
      }
    });
  }

  // ============================================
  // VALIDAR FORMULARIO
  // ============================================

  private validateForm(): string | null {

    if (this.selectedItemId === null) {
      return 'Selecciona un artículo.';
    }

    if (
      this.quantity === null ||
      !Number.isInteger(this.quantity) ||
      this.quantity <= 0
    ) {
      return 'La cantidad debe ser un entero mayor que cero.';
    }

    if (!this.reason.trim()) {
      return 'Es obligatorio indicar el motivo de la reposición.';
    }

    if (this.reference.trim().length > 100) {
      return 'La referencia no puede superar 100 caracteres.';
    }

    return null;
  }

  // ============================================
  // REGISTRAR REPOSICIÓN
  // ============================================

  save(): void {

    // Evita múltiples envíos simultáneos.
    if (this.saving()) {
      return;
    }

    const validationError = this.validateForm();

    if (validationError) {
      this.error.set(validationError);
      this.success.set('');
      return;
    }

    const itemId = this.selectedItemId!;
    const quantity = this.quantity!;

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.service.create(itemId, {
      quantity,
      reason: this.reason.trim(),
      reference: this.reference.trim() || null
    }).subscribe({

      next: response => {

        this.capacity.set(response.capacity);

        this.success.set(
          `Reposición #${response.replenishment.id} registrada correctamente.`
        );

        this.quantity = null;
        this.reason = '';
        this.reference = '';

        this.saving.set(false);

        // Refrescar el historial desde la primera página.
        this.loadHistory(1);

        // Actualizar las existencias.
        this.loadItems();
      },

      error: err => {

        console.error(
          'Error registrando reposición:',
          err
        );

        const backendError = err.error?.error;

        const messages: Record<string, string> = {
          invalid_json: 'El cuerpo de la solicitud no es válido.',
          invalid_payload: 'Los datos de la reposición son incorrectos.',
          invalid_quantity: 'La cantidad debe ser mayor que cero.',
          invalid_reason: 'El motivo de reposición es inválido.',
          invalid_reference: 'La referencia es inválida.',
          item_not_found: 'El artículo no existe.',
          forbidden: 'No tienes permisos para registrar reposiciones.'
        };

        this.error.set(
          messages[backendError] ??
          'No fue posible registrar la reposición.'
        );

        this.saving.set(false);
      }
    });
  }

  // ============================================
  // PAGINACIÓN
  // ============================================

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.loadHistory(this.currentPage() + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.loadHistory(this.currentPage() - 1);
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  formatQuantity(quantity: number): string {
    return new Intl.NumberFormat('es-MX').format(quantity);
  }

  clearMessages(): void {
    this.error.set('');
    this.success.set('');
  }
}
