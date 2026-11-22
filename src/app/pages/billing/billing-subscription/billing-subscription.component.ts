import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import {
  BillingService, FEATURE_LABELS, SUBSCRIPTION_STATUS_CLASSES, SUBSCRIPTION_STATUS_LABELS,
  SubscriptionResponse, UsageItem,
} from '../billing.service';

@Component({
  selector: 'app-billing-subscription',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './billing-subscription.component.html',
})
export class BillingSubscriptionComponent {
  private readonly api = inject(BillingService);
  readonly auth = inject(AuthService);

  readonly data = signal<SubscriptionResponse | null>(null);
  readonly usage = signal<UsageItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly confirmCancel = signal(false);
  readonly canceling = signal(false);

  readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  readonly statusClasses = SUBSCRIPTION_STATUS_CLASSES;
  readonly featureLabels = FEATURE_LABELS;
  readonly canManage = computed(() => this.auth.hasPermission('billing.manage'));
  readonly cancellable = computed(() =>
    ['active', 'trialing', 'past_due', 'paused'].includes(this.data()?.status ?? ''));

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [current, usage] = await Promise.all([
        firstValueFrom(this.api.current()),
        firstValueFrom(this.api.usage()),
      ]);
      this.data.set(current);
      this.usage.set(usage.items ?? []);
    } catch {
      this.error.set('No se pudo consultar la suscripción.');
    } finally {
      this.loading.set(false);
    }
  }

  percent(item: UsageItem): number {
    if (item.limit_value === null || item.limit_value <= 1 || item.used === null) return 0;
    return Math.min(100, Math.round((item.used / item.limit_value) * 100));
  }

  async cancel(): Promise<void> {
    this.canceling.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await firstValueFrom(this.api.cancel());
      this.message.set('Tu suscripción fue cancelada en Mercado Pago. No se realizarán más cobros.');
      this.confirmCancel.set(false);
      await this.load();
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? err.error?.error : '';
      this.error.set(code === 'cancellation_not_confirmed'
        ? 'Mercado Pago aún no confirma la cancelación. Vuelve a intentarlo en unos minutos.'
        : 'No fue posible cancelar la suscripción. Intenta de nuevo.');
    } finally {
      this.canceling.set(false);
    }
  }
}
