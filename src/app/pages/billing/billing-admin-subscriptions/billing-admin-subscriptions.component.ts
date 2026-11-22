import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import {
  BillingService, OperatorAudit, OperatorPayment, OperatorSubscription, Page, ReconciliationIssue,
  SUBSCRIPTION_STATUS_CLASSES, SUBSCRIPTION_STATUS_LABELS,
} from '../billing.service';

@Component({
  selector: 'app-billing-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './billing-admin-subscriptions.component.html',
})
export class BillingAdminSubscriptionsComponent {
  private readonly api = inject(BillingService);
  readonly page = signal<Page<OperatorSubscription> | null>(null);
  readonly issues = signal<ReconciliationIssue[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly detail = signal<{ sub: OperatorSubscription; payments: OperatorPayment[]; audits: OperatorAudit[] } | null>(null);
  readonly detailLoading = signal(false);

  readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  readonly statusClasses = SUBSCRIPTION_STATUS_CLASSES;
  readonly statuses = ['active', 'trialing', 'past_due', 'paused', 'incomplete', 'canceled', 'expired'];
  status = '';
  search = '';

  constructor() {
    void this.load(1);
  }

  async load(pageNumber: number): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [page, issues] = await Promise.all([
        firstValueFrom(this.api.operatorSubscriptions(pageNumber, this.status, this.search)),
        firstValueFrom(this.api.reconciliationIssues()),
      ]);
      this.page.set(page);
      this.issues.set(issues.items);
    } catch {
      this.error.set('No fue posible cargar las suscripciones.');
    } finally {
      this.loading.set(false);
    }
  }

  async open(sub: OperatorSubscription): Promise<void> {
    this.detailLoading.set(true);
    this.detail.set({ sub, payments: [], audits: [] });
    try {
      const [payments, audits] = await Promise.all([
        firstValueFrom(this.api.tenantPayments(sub.tenant_id)),
        firstValueFrom(this.api.tenantAudits(sub.tenant_id)),
      ]);
      this.detail.set({ sub, payments: payments.items, audits: audits.items });
    } catch {
      this.error.set('No fue posible cargar el detalle.');
    } finally {
      this.detailLoading.set(false);
    }
  }
}
