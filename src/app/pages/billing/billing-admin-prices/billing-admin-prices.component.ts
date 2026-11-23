import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { BillingService, OperatorPlan, Page, PlanPrice, PriceAudit } from '../billing.service';

const ERRORS: Record<string, string> = {
  invalid_amount: 'Importe inválido: usa un número positivo con máximo dos decimales.',
  amount_unchanged: 'El importe es igual al vigente.',
  price_not_active: 'Solo se puede cambiar el importe de un precio activo.',
  concurrent_price_update: 'Otro operador cambió este precio. Recarga e intenta de nuevo.',
  state_unchanged: 'El precio ya estaba en ese estado.',
};

type PendingAction =
  | { kind: 'reprice'; price: PlanPrice; amount: string; plan: OperatorPlan }
  | { kind: 'toggle'; price: PlanPrice; active: boolean; plan: OperatorPlan };

@Component({
  selector: 'app-billing-admin-prices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './billing-admin-prices.component.html',
})
export class BillingAdminPricesComponent {
  private readonly api = inject(BillingService);
  readonly plans = signal<OperatorPlan[]>([]);
  readonly audits = signal<Page<PriceAudit> | null>(null);
  readonly drafts = signal<Partial<Record<number, string>>>({});
  readonly showHistory = signal(false);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly pending = signal<PendingAction | null>(null);

  constructor() {
    void this.load();
  }

  planName(planId: number): string {
    return this.plans().find(p => p.id === planId)?.name ?? `#${planId}`;
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [plans, audits] = await Promise.all([
        firstValueFrom(this.api.operatorPrices(this.showHistory())),
        firstValueFrom(this.api.priceAudits(this.audits()?.page ?? 1)),
      ]);
      this.plans.set(plans.items);
      this.audits.set(audits);
    } catch (err) {
      this.error.set(err instanceof HttpErrorResponse && err.status === 403
        ? 'Acceso restringido al operador global.' : 'No fue posible cargar los precios.');
    } finally {
      this.loading.set(false);
    }
  }

  toggleHistory(): void {
    this.showHistory.update(v => !v);
    void this.load();
  }

  async auditPage(page: number): Promise<void> {
    try {
      this.audits.set(await firstValueFrom(this.api.priceAudits(page)));
    } catch {
      this.error.set('No fue posible cargar el historial.');
    }
  }

  setDraft(id: number, value: string): void {
    this.drafts.update(d => ({ ...d, [id]: value }));
  }

  askReprice(plan: OperatorPlan, price: PlanPrice): void {
    const amount = (this.drafts()[price.id] ?? '').trim();
    this.message.set('');
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      this.error.set(ERRORS['invalid_amount']);
      return;
    }
    this.error.set('');
    this.pending.set({ kind: 'reprice', plan, price, amount });
  }

  askToggle(plan: OperatorPlan, price: PlanPrice): void {
    this.error.set('');
    this.message.set('');
    this.pending.set({ kind: 'toggle', plan, price, active: !price.active });
  }

  async confirm(): Promise<void> {
    const action = this.pending();
    if (!action) return;
    this.busy.set(true);
    try {
      if (action.kind === 'reprice') {
        const r = await firstValueFrom(this.api.updatePrice(action.price.id, action.amount));
        this.message.set(`Nuevo precio v${r.price.version} publicado para nuevas contrataciones.`);
        this.drafts.update(d => { const c = { ...d }; delete c[action.price.id]; return c; });
      } else {
        await firstValueFrom(this.api.setPriceActive(action.price.id, action.active));
        this.message.set(action.active ? 'Precio activado.' : 'Precio desactivado: ya no se ofrece a nuevos clientes.');
      }
      this.pending.set(null);
      await this.load();
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? err.error?.error : '';
      this.error.set(ERRORS[code] ?? 'No fue posible aplicar el cambio.');
      this.pending.set(null);
    } finally {
      this.busy.set(false);
    }
  }
}
