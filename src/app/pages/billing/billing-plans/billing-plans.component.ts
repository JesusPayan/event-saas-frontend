import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import {
  BillingInterval, BillingService, FEATURE_LABELS, Plan, PlanPrice, SubscriptionResponse,
} from '../billing.service';

const CHECKOUT_ERRORS: Record<string, string> = {
  subscription_already_exists: 'Tu empresa ya tiene una suscripción vigente.',
  checkout_already_pending: 'Ya iniciaste un pago hace menos de 30 minutos. Complétalo en la pestaña de Mercado Pago o vuelve a intentarlo cuando venza ese plazo.',
  invalid_plan_price: 'El precio seleccionado ya no está disponible. Recarga la página.',
  invalid_payer_email: 'Ingresa un correo válido para Mercado Pago.',
  invalid_return_url: 'El pago no está disponible temporalmente (configuración del servidor).',
  payment_provider_unavailable: 'Mercado Pago no respondió. Intenta de nuevo en unos minutos.',
  payment_provider_rejected: 'Mercado Pago rechazó la solicitud. Verifica que el correo sea de una cuenta de Mercado Pago distinta a la del vendedor y del mismo tipo (prueba o real).',
  payment_provider_misconfigured: 'El cobro no está disponible: la configuración de Mercado Pago del servidor no es válida.',
};

@Component({
  selector: 'app-billing-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './billing-plans.component.html',
})
export class BillingPlansComponent {
  private readonly api = inject(BillingService);
  readonly auth = inject(AuthService);

  readonly plans = signal<Plan[]>([]);
  readonly current = signal<SubscriptionResponse | null>(null);
  readonly interval = signal<BillingInterval>('month');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selected = signal<{ plan: Plan; price: PlanPrice } | null>(null);
  readonly busy = signal(false);
  payerEmail = '';

  readonly canBuy = computed(() => this.auth.hasPermission('billing.manage'));
  readonly hasActive = computed(() =>
    ['active', 'trialing', 'past_due', 'paused'].includes(this.current()?.status ?? ''));
  readonly featureLabels = FEATURE_LABELS;

  constructor() {
    this.payerEmail = this.auth.me()?.email ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [plans, current] = await Promise.all([
        firstValueFrom(this.api.listPlans()),
        firstValueFrom(this.api.current()),
      ]);
      this.plans.set(plans.items);
      this.current.set(current);
    } catch {
      this.error.set('No fue posible cargar el catálogo de planes.');
    } finally {
      this.loading.set(false);
    }
  }

  priceFor(plan: Plan): PlanPrice | undefined {
    return plan.prices.find(p => p.billing_interval === this.interval());
  }

  monthlyEquivalent(price: PlanPrice): number {
    return price.billing_interval === 'year' ? Number(price.amount) / 12 : Number(price.amount);
  }

  limitLabel(limit: number | null): string {
    if (limit === null) return 'Ilimitado';
    if (limit === 0) return 'No incluido';
    if (limit === 1) return 'Incluido';
    return String(limit);
  }

  isCurrentPlan(plan: Plan): boolean {
    return this.hasActive() && this.current()?.subscription?.plan_code === plan.code;
  }

  choose(plan: Plan): void {
    const price = this.priceFor(plan);
    if (!price) return;
    this.error.set('');
    this.selected.set({ plan, price });
  }

  cancelSelection(): void {
    if (!this.busy()) {
      this.selected.set(null);
      this.error.set('');
    }
  }

  async confirmCheckout(): Promise<void> {
    const choice = this.selected();
    const email = this.payerEmail.trim();
    if (!choice) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.error.set(CHECKOUT_ERRORS['invalid_payer_email']);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      // Solo se envía el identificador del precio: el importe lo define el servidor.
      const result = await firstValueFrom(this.api.checkout(choice.price.id, email));
      if (!/^https:\/\//.test(result.init_point)) {
        throw new Error('invalid_init_point');
      }
      window.location.assign(result.init_point);
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? err.error?.error : '';
      this.error.set(CHECKOUT_ERRORS[code] ?? 'No fue posible iniciar el pago. Intenta de nuevo.');
      this.busy.set(false);
    }
  }
}
