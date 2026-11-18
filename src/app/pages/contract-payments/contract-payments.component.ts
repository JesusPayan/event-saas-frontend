import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ContractsService, GeneratedContract } from '../../services/contracts.service';
import {
  ContractPaymentsService, ContractPayment, ContractPaymentBalance,
  PaymentAudit, PaymentMethod, PaymentType
} from '../../services/contract-payments.service';

type PaymentAction = 'confirm' | 'cancel';

@Component({
  selector: 'app-contract-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contract-payments.component.html'
})
export class ContractPaymentsComponent implements OnInit {
  private readonly contractsApi = inject(ContractsService);
  private readonly paymentsApi = inject(ContractPaymentsService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly contractId = Number(this.route.snapshot.paramMap.get('id'));
  readonly contract = signal<GeneratedContract | null>(null);
  readonly balance = signal<ContractPaymentBalance | null>(null);
  readonly payments = signal<ContractPayment[]>([]);
  readonly audits = signal<PaymentAudit[]>([]);
  readonly selectedPayment = signal<ContractPayment | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly refreshingFinancial = signal(false);
  readonly auditLoading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly showForm = signal(false);
  readonly search = signal('');
  readonly statusFilter = signal('all');
  readonly actionPayment = signal<ContractPayment | null>(null);
  readonly actionType = signal<PaymentAction | null>(null);
  readonly actionNotes = signal('');

  amount = '';
  paymentType: PaymentType = 'advance';
  paymentMethod: PaymentMethod = 'bank_transfer';
  reference = '';
  notes = '';

  readonly canReadPayments = computed(() => this.auth.permissions().includes('contracts.read'));
  readonly canUpdatePayments = computed(() => this.auth.permissions().includes('contracts.update'));
  readonly locked = computed(() => this.loading() || this.busy() || this.refreshingFinancial());
  readonly canRegister = computed(() =>
    this.canUpdatePayments() && 
    this.contract()?.status === 'active' && !
    this.locked() &&
    Number(this.balance()?.balance ?? 0) > 0 &&
  !this.busy() &&
  !this.loading() &&
  !this.refreshingFinancial()
  );
  readonly filteredPayments = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.payments().filter(payment => {
      const searchable = [payment.id, payment.reference ?? '', payment.payment_type,
        payment.payment_method, payment.amount].join(' ').toLowerCase();
      return (status === 'all' || payment.status === status) &&
        (!query || searchable.includes(query));
    });
  });
  readonly progress = computed(() => {
    const data = this.balance();
    if (!data) return 0;
    const total = Number(data.total);
    const paid = Number(data.paid);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(paid)) return 0;
    return Math.min(100, Math.max(0, Math.round(paid / total * 100)));
  });

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    if (!Number.isSafeInteger(this.contractId) || this.contractId <= 0) {
      this.error.set('Identificador de contrato inválido.');
      return;
    }
    if (this.locked()) return;
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      contract: this.contractsApi.getById(this.contractId),
      balance: this.paymentsApi.balance(this.contractId),
      payments: this.paymentsApi.list(this.contractId)
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => {
        this.contract.set(result.contract);
        this.balance.set(result.balance);
        this.payments.set(result.payments.items);
      },
      error: err => {
        this.contract.set(null);
        this.balance.set(null);
        this.payments.set([]);
        this.error.set(this.errorMessage(err));
      }
    });
  }

  register(): void {
    if (!this.canRegister()) return;
    const amount = this.amount.trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 ||
        !Number.isFinite(Number(amount)) || Number(amount) > 999999999999.99) {
      this.error.set('Introduce un importe positivo con máximo dos decimales.');
      return;
    }
    const reference = this.reference.trim();
    if (reference.length > 120 || this.notes.length > 2000) {
      this.error.set('Revisa la longitud de referencia y notas.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.paymentsApi.create(this.contractId, {
      amount,
      payment_type: this.paymentType,
      payment_method: this.paymentMethod,
      ...(reference ? { reference } : {}),
      ...(this.notes ? { notes: this.notes } : {})
    }).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.message.set('Pago registrado como pendiente de confirmación.');
        this.resetForm();
        this.showForm.set(false);
        this.reloadFinancialData();
      },
      error: err => this.error.set(this.errorMessage(err))
    });
  }

  openAction(payment: ContractPayment, action: PaymentAction): void {
    if (!this.canUpdatePayments() || this.locked() || payment.status !== 'pending') return;
    if (action === 'confirm' && this.contract()?.status !== 'active') return;
    this.actionPayment.set(payment);
    this.actionType.set(action);
    this.actionNotes.set('');
    this.error.set('');
  }

  closeAction(): void {
    if (this.busy()) return;
    this.actionPayment.set(null);
    this.actionType.set(null);
    this.actionNotes.set('');
  }

  submitAction(): void {
    const payment = this.actionPayment();
    const action = this.actionType();
    if (!payment || !action || !this.canUpdatePayments() || this.locked() ||
        payment.status !== 'pending') return;
    if (action === 'confirm' && this.contract()?.status !== 'active') return;
    const reason = this.actionNotes().trim();
    if (action === 'cancel' && reason.length > 2000) {
      this.error.set('El motivo no puede superar 2000 caracteres.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    const request$ = action === 'confirm'
      ? this.paymentsApi.confirm(this.contractId, payment.id)
      : this.paymentsApi.cancel(this.contractId, payment.id, reason || undefined);
    request$.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.actionPayment.set(null);
        this.actionType.set(null);
        this.actionNotes.set('');
        this.message.set(action === 'confirm'
          ? 'Pago confirmado correctamente.' : 'Pago pendiente cancelado.');
        this.reloadFinancialData();
      },
      error: err => {
        this.error.set(this.errorMessage(err));
        this.reloadFinancialData();
      }
    });
  }

  showAudit(payment: ContractPayment): void {
    if (!this.canReadPayments()) return;
    this.selectedPayment.set(payment);
    this.audits.set([]);
    this.auditLoading.set(true);
    this.error.set('');
    this.paymentsApi.audit(this.contractId, payment.id)
      .pipe(finalize(() => this.auditLoading.set(false)))
      .subscribe({
        next: response => {
          if (this.selectedPayment()?.id === payment.id) this.audits.set(response.items);
        },
        error: err => {
          if (this.selectedPayment()?.id === payment.id) this.error.set(this.errorMessage(err));
        }
      });
  }

  closeAudit(): void {
    if (this.auditLoading()) return;
    this.selectedPayment.set(null);
    this.audits.set([]);
  }

  resetForm(): void {
    this.amount = '';
    this.paymentType = 'advance';
    this.paymentMethod = 'bank_transfer';
    this.reference = '';
    this.notes = '';
  }

  typeLabel(type: string): string { return type === 'advance' ? 'Anticipo' : 'Abono'; }
  methodLabel(method: string): string {
    return ({ cash: 'Efectivo', bank_transfer: 'Transferencia', card: 'Tarjeta', other: 'Otro' } as Record<string, string>)[method] ?? method;
  }
  statusLabel(status: string): string {
    return ({ pending: 'Pendiente', confirmed: 'Confirmado', cancelled: 'Cancelado' } as Record<string, string>)[status] ?? status;
  }
  statusClass(status: string): string {
    return ({ pending: 'bg-amber-100 text-amber-800', confirmed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-slate-100 text-slate-600' } as Record<string, string>)[status] ?? 'bg-slate-100 text-slate-600';
  }

  private reloadFinancialData(): void {
    if (this.refreshingFinancial()) return;
    this.refreshingFinancial.set(true);
    forkJoin({
      balance: this.paymentsApi.balance(this.contractId),
      payments: this.paymentsApi.list(this.contractId)
    }).pipe(finalize(() => this.refreshingFinancial.set(false))).subscribe({
      next: result => {
        this.balance.set(result.balance);
        this.payments.set(result.payments.items);
      },
      error: err => this.error.set(this.errorMessage(err))
    });
  }

  private errorMessage(err: HttpErrorResponse): string {
    const serverMessage = typeof err.error?.message === 'string' ? err.error.message : null;
    if (err.status === 401) return 'Tu sesión ha expirado.';
    if (err.status === 403) return 'No tienes permisos para esta operación.';
    if (err.status === 404) return serverMessage ?? 'Contrato o pago no encontrado.';
    if (err.status === 409) return serverMessage ?? 'Conflicto financiero. Actualiza los datos e inténtalo nuevamente.';
    if (err.status === 400) return serverMessage ?? 'Los datos enviados no son válidos.';
    return serverMessage ?? 'Ocurrió un error de comunicación.';
  }
}
