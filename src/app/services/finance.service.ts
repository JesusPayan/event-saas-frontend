import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

/** FIN-01: finanzas de la empresa (`tenant`) o de EasiAcc (`platform`). */
export type FinanceScope = 'tenant' | 'platform';
export type MovementType = 'income' | 'expense' | 'refund';

export interface FinanceFilters {
  from?: string; to?: string; type?: string; category?: string; currency?: string;
  event_id?: number | null; tenant_id?: number | null; page?: number; per_page?: number;
}
export interface Totals { income: string; expenses: string; refunds: string; net: string; count: number; }
export interface Movement {
  id: string; source: string; source_id: number; type: MovementType; direction: 'in' | 'out';
  effective_date: string; effective_at: string | null; amount: string; currency: string;
  category: string; category_label: string; description: string; editable: boolean; version?: number;
  event?: { id: number; name: string | null } | null; contract?: { id: number; number: string } | null;
  tenant?: { id: number; name: string } | null;
  original?: { source: string; source_id: number; provider_payment_id?: string } | null;
  provider_payment_id?: string; reference?: string | null;
}
export interface MovementsPage {
  items: Movement[]; total: number; page: number; per_page: number; pages: number;
  totals: Record<string, Totals>; filters: Record<string, string | number | null>;
}
export interface FinanceNotes {
  metric: string; income_source: string; available_since: string | null; undated_reversals: number;
  fees?: string; partial_refunds?: string; client_refunds?: string;
}
export interface FinanceSummary {
  totals: Record<string, Totals>; notes: FinanceNotes;
  receivables?: Record<string, { receivable?: string; pending_confirmation?: string }>;
}
export interface Option { code: string; name: string; }
export interface FinanceOptions {
  currencies: string[]; expense_categories: Option[]; derived_categories: Option[]; types: Option[];
}
export interface Expense {
  id: number; scope: FinanceScope; expense_date: string; amount: string; currency: string; category: string;
  category_label: string; description: string; status: 'active' | 'voided'; version: number;
  event: { id: number; name: string | null } | null;
}
export interface ExpenseRevision {
  id: number; action: 'created' | 'updated' | 'voided'; actor_email: string | null; reason: string | null;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null; created_at: string;
}
export interface ExpensePayload {
  expense_date?: string; amount?: string; currency?: string; category?: string; description?: string;
  event_id?: number | null; reason?: string; version?: number;
}

export const FINANCE_ERRORS: Record<string, string> = {
  invalid_date: 'Revisa la fecha.', future_date: 'La fecha del egreso no puede ser futura.',
  invalid_range: 'La fecha inicial debe ser anterior a la final.', range_too_large: 'El periodo es demasiado largo.',
  invalid_amount: 'Escribe un importe mayor a cero con hasta dos decimales.',
  invalid_currency: 'Moneda no válida.', invalid_category: 'Elige una categoría.',
  invalid_description: 'Escribe una descripción (máximo 500 caracteres).',
  event_not_found: 'El evento no pertenece a tu empresa.', reason_required: 'Escribe el motivo (mínimo 3 caracteres).',
  stale_version: 'Alguien más modificó este egreso. Vuelve a abrirlo.', expense_voided: 'El egreso ya está anulado.',
  expense_not_found: 'No encontramos el egreso.', idempotency_key_conflict: 'La solicitud ya se registró con otros datos.',
  forbidden: 'No tienes permiso para esta acción.',
};

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpClient);

  private base(scope: FinanceScope): string { return scope === 'platform' ? '/api/v1/platform/finance' : '/api/v1/finance'; }

  private params(f: FinanceFilters): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(f)) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return p;
  }

  options(scope: FinanceScope) { return this.http.get<FinanceOptions>(`${this.base(scope)}/options`); }
  summary(scope: FinanceScope, f: FinanceFilters) {
    return this.http.get<FinanceSummary>(`${this.base(scope)}/summary`, { params: this.params(f) });
  }
  movements(scope: FinanceScope, f: FinanceFilters) {
    return this.http.get<MovementsPage>(`${this.base(scope)}/movements`, { params: this.params(f) });
  }
  /** El CSV se descarga con la sesión (encabezados) y los mismos filtros que la vista. */
  exportCsv(scope: FinanceScope, f: FinanceFilters) {
    const { page: _p, per_page: _pp, ...rest } = f;
    return this.http.get(`${this.base(scope)}/movements.csv`, { params: this.params(rest), responseType: 'blob' });
  }
  expense(scope: FinanceScope, id: number) {
    return this.http.get<{ expense: Expense; history: ExpenseRevision[] }>(`${this.base(scope)}/expenses/${id}`);
  }
  createExpense(scope: FinanceScope, body: ExpensePayload, idempotencyKey: string) {
    return this.http.post<{ expense: Expense }>(`${this.base(scope)}/expenses`, body,
      { headers: scope === 'tenant' ? { 'Idempotency-Key': idempotencyKey } : {} });
  }
  updateExpense(scope: FinanceScope, id: number, body: ExpensePayload) {
    return this.http.patch<{ expense: Expense; changed: boolean }>(`${this.base(scope)}/expenses/${id}`, body);
  }
  voidExpense(scope: FinanceScope, id: number, reason: string) {
    return this.http.post<{ expense: Expense; changed: boolean }>(`${this.base(scope)}/expenses/${id}/void`, { reason });
  }
}
