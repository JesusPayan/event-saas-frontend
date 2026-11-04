
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import {
  InventoryCharge,
  ChargeAudit,
  ChargeStatus
} from '../../../models/inventory-charge.model';

import {
  InventoryChargesService
} from '../../../services/inventory-charges.service';

type Action = 'approve' | 'waive' | 'pay';

@Component({
  selector: 'app-inventory-charges',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-charges.component.html'
})
export class InventoryChargesComponent implements OnInit {
  private service = inject(InventoryChargesService);

  charges = signal<InventoryCharge[]>([]);
  audits = signal<ChargeAudit[]>([]);

  loading = signal(false);
  saving = signal(false);
  error = signal('');
  success = signal('');

  statusFilter = signal('all');
  selectedCharge = signal<InventoryCharge | null>(null);
  selectedAction = signal<Action | null>(null);

  notes = '';
  paymentReference = '';
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other' =
    'transfer';

  filteredCharges = computed(() => {
    const filter = this.statusFilter();

    return this.charges().filter(charge =>
      filter === 'all' || charge.status === filter
    );
  });

  ngOnInit(): void {
    this.loadCharges();
  }

  loadCharges(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.getCharges().subscribe({
      next: response => {
        this.charges.set(response.items);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(this.getError(err));
        this.loading.set(false);
      }
    });
  }

  changeFilter(value: string): void {
    this.statusFilter.set(value);
  }

  openAction(
    charge: InventoryCharge,
    action: Action
  ): void {
    this.selectedCharge.set(charge);
    this.selectedAction.set(action);

    this.notes = '';
    this.paymentReference = '';
    this.paymentMethod = 'transfer';
    this.error.set('');
    this.success.set('');
  }

  closeAction(): void {
    if (this.saving()) return;

    this.selectedAction.set(null);
    this.selectedCharge.set(null);
  }

  submitAction(): void {
    const charge = this.selectedCharge();
    const action = this.selectedAction();

    if (!charge || !action || this.saving()) return;

    if (action === 'waive' && !this.notes.trim()) {
      this.error.set('La condonación requiere un motivo.');
      return;
    }

    if (action === 'pay' && !this.paymentReference.trim()) {
      this.error.set('Ingresa la referencia del pago.');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const request$ =
      action === 'approve'
        ? this.service.approve(charge.id, this.notes)
        : action === 'waive'
          ? this.service.waive(charge.id, this.notes)
          : this.service.pay(charge.id, {
              notes: this.notes,
              payment_reference: this.paymentReference,
              payment_method: this.paymentMethod
            });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.selectedAction.set(null);
        this.selectedCharge.set(null);
        this.success.set('Operación registrada correctamente.');
        this.loadCharges();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(this.getError(err));
      }
    });
  }

  showAudit(charge: InventoryCharge): void {
    this.selectedAction.set(null);
    this.selectedCharge.set(charge);
    this.audits.set([]);
    this.error.set('');

    this.service.getAudit(charge.id).subscribe({
      next: response => this.audits.set(response.items),
      error: err => this.error.set(this.getError(err))
    });
  }

  statusLabel(status: ChargeStatus): string {
    return {
      pending: 'Pendiente',
      approved: 'Aprobado',
      waived: 'Condonado',
      paid: 'Pagado'
    }[status];
  }

  private getError(err: HttpErrorResponse): string {
    const code = err.error?.error || err.error?.msg;

    return code
      ? `Error ${err.status}: ${code}`
      : `No fue posible completar la operación (${err.status}).`;
  }
}
