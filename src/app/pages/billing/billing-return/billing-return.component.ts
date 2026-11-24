import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { BillingService } from '../billing.service';

type ReturnState = 'checking' | 'active' | 'waiting' | 'failed';

/**
 * Pantalla de regreso desde Mercado Pago.
 * Nunca usa los parámetros de la URL como evidencia de pago: solo consulta el
 * estado que el backend verificó con la API de Mercado Pago (webhook).
 */
@Component({
  selector: 'app-billing-return',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './billing-return.component.html',
})
export class BillingReturnComponent {
  private readonly api = inject(BillingService);
  readonly state = signal<ReturnState>('checking');
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private static readonly MAX_ATTEMPTS = 10;

  constructor() {
    inject(DestroyRef).onDestroy(() => { if (this.timer) clearTimeout(this.timer); });
    void this.poll();
  }

  async poll(): Promise<void> {
    this.attempts += 1;
    try {
      const [sub, checkout] = await Promise.all([
        firstValueFrom(this.api.current()),
        firstValueFrom(this.api.latestCheckout()),
      ]);
      if (sub.status === 'active' || sub.status === 'trialing') {
        this.state.set('active');
        return;
      }
      if (checkout.checkout?.status === 'failed' || checkout.checkout?.status === 'canceled') {
        this.state.set('failed');
        return;
      }
      this.state.set('waiting');
    } catch {
      this.state.set('waiting');
    }
    if (this.attempts < BillingReturnComponent.MAX_ATTEMPTS) {
      this.timer = setTimeout(() => void this.poll(), 3000);
    }
  }

  retry(): void {
    this.attempts = 0;
    this.state.set('checking');
    void this.poll();
  }
}
