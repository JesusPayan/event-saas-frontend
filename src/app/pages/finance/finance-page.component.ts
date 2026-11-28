import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { AuthService } from '../../services/auth.service';
import { EventsService } from '../../services/events.service';
import {
  Expense, ExpensePayload, ExpenseRevision, FINANCE_ERRORS, FinanceFilters, FinanceNotes, FinanceOptions,
  FinanceScope, FinanceService, Movement, Totals,
} from '../../services/finance.service';

const TYPE_LABELS: Record<string, string> = { income: 'Ingreso', expense: 'Egreso', refund: 'Reembolso' };
const PER_PAGE = 25;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function monthStart(): string { return today().slice(0, 8) + '01'; }

interface ExpenseForm {
  id: number | null; version: number; expense_date: string; amount: string; currency: string; category: string;
  description: string; event_id: number | null; reason: string;
}

/**
 * FIN-01: Finanzas de la empresa (`/finance`) y de EasiAcc (`/platform/finance`).
 * El servidor resuelve la empresa y aplica permisos; esta vista solo refleja lo que recibe.
 */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './finance-page.component.html' })
export class FinancePageComponent {
  private readonly api = inject(FinanceService);
  private readonly events = inject(EventsService);
  readonly auth = inject(AuthService);
  readonly scope: FinanceScope = inject(ActivatedRoute).snapshot.data['scope'] === 'platform' ? 'platform' : 'tenant';

  readonly options = signal<FinanceOptions | null>(null);
  readonly items = signal<Movement[]>([]);
  readonly totals = signal<Record<string, Totals>>({});
  readonly notes = signal<FinanceNotes | null>(null);
  readonly receivables = signal<Record<string, { receivable?: string; pending_confirmation?: string }>>({});
  readonly total = signal(0);
  readonly pages = signal(1);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly message = signal('');
  readonly eventOptions = signal<{ id: number; name: string }[]>([]);
  readonly tenantFilter = signal<{ id: number; name: string } | null>(null);

  readonly form = signal<ExpenseForm | null>(null);
  readonly voidTarget = signal<Movement | null>(null);
  readonly history = signal<{ expense: Expense; history: ExpenseRevision[] } | null>(null);
  voidReason = '';
  private idempotencyKey = '';

  filters: { from: string; to: string; type: string; category: string; currency: string; event_id: string } = {
    from: monthStart(), to: today(), type: '', category: '', currency: '', event_id: '',
  };

  readonly title = this.scope === 'platform' ? 'Finanzas de EasiAcc' : 'Finanzas';
  readonly description = this.scope === 'platform'
    ? 'Cobros de suscripciones, reembolsos y egresos propios de EasiAcc. No incluye los cobros de las empresas a sus clientes.'
    : 'Dinero efectivamente cobrado a tus clientes, egresos pagados y flujo neto registrado del periodo.';
  readonly canManage = computed(() => this.scope === 'platform'
    ? this.auth.hasPlatformPermission('platform.finance.manage') : this.auth.hasPermission('finance.manage'));
  readonly currencies = computed(() => Object.keys(this.totals()));
  readonly categories = computed(() => {
    const o = this.options();
    return o ? [...o.derived_categories, ...o.expense_categories] : [];
  });
  readonly typeLabels = TYPE_LABELS;
  readonly todayStr = today();

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    try {
      this.options.set(await firstValueFrom(this.api.options(this.scope)));
      if (this.scope === 'tenant' && this.auth.hasPermission('events.read')) {
        const page = await firstValueFrom(this.events.list({ per_page: 100 }));
        this.eventOptions.set(page.items.map(e => ({ id: e.id, name: e.name })));
      }
    } catch {
      // Sin opciones la vista sigue funcionando con filtros básicos.
    }
    await this.load(1);
  }

  private query(page: number): FinanceFilters {
    const f = this.filters;
    return {
      from: f.from, to: f.to, type: f.type, category: f.category, currency: f.currency, page, per_page: PER_PAGE,
      ...(this.scope === 'tenant' ? { event_id: f.event_id ? Number(f.event_id) : null }
        : { tenant_id: this.tenantFilter()?.id ?? null }),
    };
  }

  private code(err: unknown): string { return err instanceof HttpErrorResponse ? (err.error?.error ?? '') : ''; }

  async load(page = 1): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const q = this.query(page);
      const [movements, summary] = await Promise.all([
        firstValueFrom(this.api.movements(this.scope, q)), firstValueFrom(this.api.summary(this.scope, q))]);
      this.items.set(movements.items);
      this.totals.set(movements.totals);
      this.total.set(movements.total);
      this.pages.set(movements.pages);
      this.page.set(movements.page);
      this.notes.set(summary.notes);
      this.receivables.set(summary.receivables ?? {});
    } catch (err) {
      this.error.set(FINANCE_ERRORS[this.code(err)] ?? 'No se pudieron cargar las finanzas.');
    } finally {
      this.loading.set(false);
    }
  }

  clearFilters(): void {
    this.filters = { from: monthStart(), to: today(), type: '', category: '', currency: '', event_id: '' };
    this.tenantFilter.set(null);
    void this.load(1);
  }

  filterTenant(t: { id: number; name: string } | null | undefined): void {
    if (!t) return;
    this.tenantFilter.set(t);
    void this.load(1);
  }

  clearTenant(): void { this.tenantFilter.set(null); void this.load(1); }

  receivableCurrencies(): string[] { return Object.keys(this.receivables()); }

  signed(m: Movement): string { return (m.direction === 'in' ? '+' : '−') + m.amount; }

  async exportCsv(): Promise<void> {
    this.busy.set(true);
    try {
      const blob = await firstValueFrom(this.api.exportCsv(this.scope, this.query(1)));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.scope === 'platform' ? 'finanzas_easiacc' : 'finanzas'}_${this.filters.from}_${this.filters.to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.error.set('No fue posible exportar el CSV.');
    } finally {
      this.busy.set(false);
    }
  }

  // ---------------------------------------------------------------- Egresos

  openCreate(): void {
    this.formError.set('');
    this.idempotencyKey = crypto.randomUUID();
    this.form.set({ id: null, version: 1, expense_date: today(), amount: '', currency: 'MXN',
      category: '', description: '', event_id: null, reason: '' });
  }

  async openEdit(m: Movement): Promise<void> {
    this.formError.set('');
    try {
      const { expense } = await firstValueFrom(this.api.expense(this.scope, m.source_id));
      this.form.set({ id: expense.id, version: expense.version, expense_date: expense.expense_date,
        amount: expense.amount, currency: expense.currency, category: expense.category,
        description: expense.description, event_id: expense.event?.id ?? null, reason: '' });
    } catch (err) {
      this.error.set(FINANCE_ERRORS[this.code(err)] ?? 'No se pudo abrir el egreso.');
    }
  }

  patchForm(changes: Partial<ExpenseForm>): void {
    const f = this.form();
    if (f) this.form.set({ ...f, ...changes });
  }

  async saveExpense(): Promise<void> {
    const f = this.form();
    if (!f) return;
    this.busy.set(true);
    this.formError.set('');
    const body: ExpensePayload = {
      expense_date: f.expense_date, amount: String(f.amount).trim(), currency: f.currency,
      category: f.category, description: f.description.trim(),
      ...(this.scope === 'tenant' ? { event_id: f.event_id ? Number(f.event_id) : null } : {}),
    };
    try {
      if (f.id === null) {
        await firstValueFrom(this.api.createExpense(this.scope, body, this.idempotencyKey));
        this.message.set('Egreso registrado.');
      } else {
        await firstValueFrom(this.api.updateExpense(this.scope, f.id, { ...body, reason: f.reason.trim(), version: f.version }));
        this.message.set('Egreso corregido. El cambio quedó en el historial.');
      }
      this.form.set(null);
      await this.load(this.page());
    } catch (err) {
      this.formError.set(FINANCE_ERRORS[this.code(err)] ?? 'No fue posible guardar el egreso.');
    } finally {
      this.busy.set(false);
    }
  }

  askVoid(m: Movement): void { this.voidReason = ''; this.formError.set(''); this.voidTarget.set(m); }

  async confirmVoid(): Promise<void> {
    const m = this.voidTarget();
    if (!m) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.voidExpense(this.scope, m.source_id, this.voidReason.trim()));
      this.message.set('Egreso anulado. Se conserva en el historial.');
      this.voidTarget.set(null);
      await this.load(this.page());
    } catch (err) {
      this.formError.set(FINANCE_ERRORS[this.code(err)] ?? 'No fue posible anular el egreso.');
    } finally {
      this.busy.set(false);
    }
  }

  async openHistory(m: Movement): Promise<void> {
    try {
      this.history.set(await firstValueFrom(this.api.expense(this.scope, m.source_id)));
    } catch (err) {
      this.error.set(FINANCE_ERRORS[this.code(err)] ?? 'No se pudo cargar el historial.');
    }
  }

  revisionText(r: ExpenseRevision): string {
    if (r.action === 'created') return 'Registró el egreso';
    if (r.action === 'voided') return 'Anuló el egreso';
    const before = r.before ?? {};
    const after = r.after ?? {};
    const changed = Object.keys(after).filter(k => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
    return 'Corrigió: ' + changed.map(k => `${k} ${before[k] ?? '—'} → ${after[k] ?? '—'}`).join('; ');
  }
}
