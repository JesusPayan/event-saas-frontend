import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BillingService, SubscriptionResponse } from '../billing.service';
@Component({
    selector: 'app-billing-subscription', standalone: true, imports: [CommonModule, RouterLink], templateUrl: `./billing-subscription.component.html`
})
export class BillingSubscriptionComponent {
    private readonly api = inject(BillingService); 
    readonly data = signal<SubscriptionResponse | null>(null); 
    readonly loading = signal(true); readonly error = signal('');
    constructor() { 
        void this.load(); 
    }
    async load() { 
        this.loading.set(true); this.error.set(''); 
        try { 
            this.data.set(await firstValueFrom(this.api.current())); 
        } 
        catch { 
            this.error.set('No se pudo consultar la suscripción.'); } finally { this.loading.set(false); } }
}
