import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { BillingService, OperatorPlan, PlanPrice } from '../billing.service';

@Component({
    selector: 'app-billing-admin-prices', standalone: true, imports: [CommonModule, FormsModule],
    templateUrl: `./billing-return.component.html`
})
export class BillingAdminPricesComponent {
    private readonly api = inject(BillingService);
    readonly plans = signal<OperatorPlan[]>([]);
    readonly drafts = signal<Record<number, string>>({});
    readonly loading = signal(true); readonly busy = signal<number | null>(null);
    readonly error = signal('');
    readonly message = signal('');
    constructor() {
        void this.load();
    }
    changeDraft(id: number, value: string | number) {
        this.drafts.update(x => ({ ...x, [id]: String(value) }));
    }
    async load() {
        this.loading.set(true);
        this.error.set('');
        try {
            this.plans.set((await firstValueFrom(this.api.operatorPrices())).items);

        } catch (err) {
            this.error.set(err instanceof HttpErrorResponse && err.status === 403 ? 'Acceso restringido al operador global.' : 'No fue posible cargar precios.');
        } finally {
            this.loading.set(false);
        }
    }
    async save(price: PlanPrice) {
        const amount = this.drafts()[price.id] ?? price.amount;
        if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
            this.error.set('Ingresa un importe positivo con máximo dos decimales.');
            return;
        }
        if (!window.confirm('¿Crear una nueva versión del precio? Las suscripciones existentes conservarán su tarifa.')) return;
        this.busy.set(price.id); this.error.set(''); this.message.set(''); try { await firstValueFrom(this.api.updatePrice(price.id, amount)); this.message.set('Precio actualizado.'); await this.load(); } catch { this.error.set('No fue posible actualizar el precio.'); } finally { this.busy.set(null); }
    }
}
