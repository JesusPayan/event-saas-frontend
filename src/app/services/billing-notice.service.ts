import { Injectable, signal } from '@angular/core';

export interface PlanLimitNotice {
  feature: string;
  reason: string;
  limit: number | null;
  used: number | null;
}

const FEATURES: Record<string, string> = {
  clients: 'clientes', events: 'eventos', members: 'usuarios',
  advanced_reports: 'reportes avanzados', inventory: 'inventario',
  quotes_contracts: 'cotizaciones y contratos', external_api: 'API externa',
};

/** Aviso global cuando el backend rechaza una acción por el plan contratado. */
@Injectable({ providedIn: 'root' })
export class BillingNoticeService {
  readonly notice = signal<PlanLimitNotice | null>(null);

  show(notice: PlanLimitNotice): void { this.notice.set(notice); }
  dismiss(): void { this.notice.set(null); }

  message(n: PlanLimitNotice): string {
    const feature = FEATURES[n.feature] ?? n.feature;
    switch (n.reason) {
      case 'limit_reached':
        return `Alcanzaste el límite de ${feature} de tu plan (${n.used ?? '?'} de ${n.limit ?? '?'}).`;
      case 'feature_disabled':
        return `Tu plan actual no incluye ${feature}.`;
      case 'not_subscribed':
        return 'Tu empresa no tiene una suscripción activa.';
      case 'period_expired':
      case 'trial_expired':
      case 'subscription_inactive':
        return 'Tu suscripción no está vigente. Renueva para continuar.';
      default:
        return 'Esta acción no está disponible con tu plan actual.';
    }
  }
}
