import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled';

interface ContractRecord {
  id: number;
  contract_number: string | null;
  client_id: number | null;
  event_id: number | null;
  status: ContractStatus | string;
  currency: string;
  total: number | string;
  created_at: string | null;
}

@Component({
  selector: 'app-contracts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contracts-list.component.html',
})
export class ContractsListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  // El interceptor de autenticación existente debe agregar Authorization y X-Tenant-ID.
  private readonly endpoint = '/api/v1/contracts';

  readonly contracts = signal<ContractRecord[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly downloadingId = signal<number | null>(null);
  readonly search = signal('');
  readonly status = signal('all');

  readonly filtered = computed(() => {
    const q = this.search().trim().toLocaleLowerCase();
    const status = this.status();
    return this.contracts().filter(contract => {
      const matchesStatus = status === 'all' || contract.status === status;
      const haystack = [contract.id, contract.contract_number, contract.client_id, contract.event_id]
        .filter(value => value !== null && value !== undefined)
        .join(' ').toLocaleLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  });

  readonly activeCount = computed(() => this.filtered().filter(c => c.status === 'active').length);
  readonly totalAmount = computed(() => this.filtered().reduce((sum, c) => sum + Number(c.total || 0), 0));
  readonly currencies = computed(() => [...new Set(this.filtered().map(c => c.currency || 'MXN'))]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<unknown>(this.endpoint).subscribe({
      next: response => {
        // Compatibilidad con respuestas [] y {items: []} / {contracts: []}.
        let records: unknown = response;
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const body = response as Record<string, unknown>;
          records = body['items'] ?? body['contracts'] ?? body['data'];
        }
        if (!Array.isArray(records)) {
          this.error.set('El API devolvió un formato de contratos no reconocido.');
          this.contracts.set([]);
        } else {
          this.contracts.set(records as ContractRecord[]);
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible cargar los contratos.');
        this.loading.set(false);
      },
    });
  }

  label(status: string): string {
    return ({ draft: 'Borrador', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado' } as Record<string, string>)[status] ?? status;
  }

  statusClass(status: string): string {
    return ({
      draft: 'bg-amber-50 text-amber-700 ring-amber-200',
      active: 'bg-blue-50 text-blue-700 ring-blue-200',
      completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      cancelled: 'bg-red-50 text-red-700 ring-red-200',
    } as Record<string, string>)[status] ?? 'bg-slate-50 text-slate-700 ring-slate-200';
  }

  money(value: number | string, currency = 'MXN'): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' })
      .format(Number(value || 0));
  }

  downloadPdf(contract: ContractRecord): void {
    this.downloadingId.set(contract.id);
    this.error.set('');
    this.http.get(`${this.endpoint}/${contract.id}/pdf`, { responseType: 'blob' }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrato-${contract.contract_number || contract.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        this.downloadingId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No se pudo descargar el PDF del contrato.');
        this.downloadingId.set(null);
      },
    });
  }
}
