
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  InventoryCapacityService,
  CapacityAlert,
  ReconciliationAudit
} from '../../../services/inventory-capacity.service';

@Component({
  selector: 'app-inventory-capacity',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="space-y-6 p-4 md:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">
            Control de déficit de inventario
          </h1>
          <p class="text-sm text-slate-500">
            Alertas persistentes y auditoría de conciliaciones.
          </p>
        </div>
        <button
          type="button"
          (click)="load()"
          [disabled]="loading()"
          class="rounded-lg bg-blue-700 px-4 py-2 text-white
                 disabled:opacity-50">
          {{ loading() ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>

      @if (error()) {
        <div class="rounded-lg bg-red-50 p-3 text-red-700">
          {{ error() }}
        </div>
      }

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl border bg-white p-5">
          <p class="text-sm text-slate-500">Alertas abiertas</p>
          <p class="mt-2 text-3xl font-bold text-red-600">
            {{ openAlerts().length }}
          </p>
        </div>
        <div class="rounded-xl border bg-white p-5">
          <p class="text-sm text-slate-500">Alertas resueltas</p>
          <p class="mt-2 text-3xl font-bold">
            {{ resolvedCount() }}
          </p>
        </div>
        <div class="rounded-xl border bg-white p-5">
          <p class="text-sm text-slate-500">
            Conciliaciones auditadas
          </p>
          <p class="mt-2 text-3xl font-bold">
            {{ audits().length }}
          </p>
        </div>
      </div>

      <div class="overflow-x-auto rounded-xl border bg-white">
        <div class="border-b p-5">
          <h2 class="font-semibold">Alertas de capacidad</h2>
          <p class="text-xs text-slate-500">
            Una misma insuficiencia puede afectar varias reservaciones.
            No sumes los déficits por fila.
          </p>
        </div>
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3">Artículo</th>
              <th class="p-3">Reservación</th>
              <th class="p-3">Demanda simultánea</th>
              <th class="p-3">Utilizable</th>
              <th class="p-3">Déficit</th>
              <th class="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (a of alerts(); track a.id) {
              <tr class="border-t">
                <td class="p-3">#{{ a.inventory_item_id }}</td>
                <td class="p-3">#{{ a.reservation_id }}</td>
                <td class="p-3">{{ a.required_quantity }}</td>
                <td class="p-3">{{ a.available_quantity }}</td>
                <td class="p-3 font-semibold text-red-600">
                  {{ a.shortage_quantity }}
                </td>
                <td class="p-3">
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [ngClass]="a.status === 'open'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'">
                    {{ a.status === 'open' ? 'Abierta' : 'Resuelta' }}
                  </span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="p-6 text-center text-slate-500">
                  No hay alertas registradas.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="overflow-x-auto rounded-xl border bg-white">
        <div class="border-b p-5">
          <h2 class="font-semibold">Auditoría de conciliaciones</h2>
        </div>
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3">Incidencia</th>
              <th class="p-3">Artículo</th>
              <th class="p-3">Ajuste</th>
              <th class="p-3">Antes</th>
              <th class="p-3">Después</th>
              <th class="p-3">Déficit</th>
              <th class="p-3">Cargo</th>
              <th class="p-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            @for (a of audits(); track a.id) {
              <tr class="border-t">
                <td class="p-3">#{{ a.incident_id }}</td>
                <td class="p-3">#{{ a.inventory_item_id }}</td>
                <td class="p-3">
                  {{ a.adjustment_type }} ({{ a.quantity }})
                </td>
                <td class="p-3">{{ a.capacity_before }}</td>
                <td class="p-3">{{ a.capacity_after }}</td>
                <td class="p-3">{{ a.shortage_after }}</td>
                <td class="p-3">
                  {{ +a.total_cost | currency:'MXN' }}
                </td>
                <td class="p-3">
                  {{ a.created_at | date:'short' }}
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="p-6 text-center text-slate-500">
                  No hay conciliaciones auditadas.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class InventoryCapacityComponent implements OnInit {
  private readonly service = inject(InventoryCapacityService);

  alerts = signal<CapacityAlert[]>([]);
  audits = signal<ReconciliationAudit[]>([]);
  loading = signal(false);
  error = signal('');

  openAlerts = () =>
    this.alerts().filter(a => a.status === 'open');

  resolvedCount = () =>
    this.alerts().filter(a => a.status === 'resolved').length;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.getAlerts().subscribe({
      next: response => {
        this.alerts.set(response.items);
        this.loadAudits();
      },
      error: err => {
        this.loading.set(false);
        this.error.set(
          err.error?.error || 'No se pudieron consultar las alertas.'
        );
      }
    });
  }

  private loadAudits(): void {
    this.service.getAudits().subscribe({
      next: response => {
        this.audits.set(response.items);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(
          err.error?.error || 'No se pudo consultar la auditoría.'
        );
      }
    });
  }
}
