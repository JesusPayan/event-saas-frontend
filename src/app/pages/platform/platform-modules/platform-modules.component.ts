import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { Adoption, FeatureFlag, ModulesApiService, PlanSummary, PlatformModule } from '../../../core/capabilities/modules-api.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

/** MOD-01: catálogo de módulos, módulos por plan, flags y adopción. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule], templateUrl: './platform-modules.component.html' })
export class PlatformModulesComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(ModulesApiService);
  readonly modules = signal<PlatformModule[]>([]);
  readonly flags = signal<FeatureFlag[]>([]);
  readonly plans = signal<PlanSummary[]>([]);
  readonly adoption = signal<Adoption | null>(null);
  readonly planEditing = signal<PlanSummary | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly canPlans = computed(() => this.auth.hasPlatformPermission('platform.plans.manage'));
  readonly canFlags = computed(() => this.auth.hasPlatformPermission('platform.flags.manage'));
  readonly configurable = computed(() => this.modules().filter(m => m.configurable));
  planSelection: Record<string, boolean> = {};

  constructor() { void this.load(); }

  moduleNames(codes: string[] | null | undefined): string { return (codes ?? []).map(c => this.moduleName(c)).join(', '); }

  moduleName(code: string): string { return this.modules().find(m => m.code === code)?.name ?? code; }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [mods, adoption] = await Promise.all([firstValueFrom(this.api.platformModules()), firstValueFrom(this.api.adoption())]);
      this.modules.set(mods.items);
      this.flags.set(mods.feature_flags);
      this.adoption.set(adoption);
      if (this.canPlans()) this.plans.set((await firstValueFrom(this.api.plans())).items);
    } catch {
      this.error.set('No se pudo cargar el catálogo de módulos.');
    } finally {
      this.loading.set(false);
    }
  }

  private async run(action: () => Promise<unknown>, ok: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await action();
      this.message.set(ok);
      await this.load();
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? err.error?.error : '';
      this.error.set(code === 'module_essential' ? 'Los módulos esenciales no se pueden apagar.' : 'No fue posible guardar el cambio.');
    } finally {
      this.busy.set(false);
    }
  }

  toggleModule(m: PlatformModule): Promise<void> {
    return this.run(() => firstValueFrom(this.api.setModuleActive(m.code, !m.is_active)),
      m.is_active ? `${m.name} quedó apagado para todas las empresas (sin borrar datos).` : `${m.name} quedó disponible.`);
  }

  toggleFlag(f: FeatureFlag): Promise<void> {
    return this.run(() => firstValueFrom(this.api.setFlag(f.code, !f.enabled)), 'Flag actualizado.');
  }

  async openPlan(p: PlanSummary): Promise<void> {
    const r = await firstValueFrom(this.api.planModules(p.id));
    this.planSelection = {};
    r.modules.forEach(code => this.planSelection[code] = true);
    this.planEditing.set(p);
  }

  savePlan(): Promise<void> {
    const p = this.planEditing();
    if (!p) return Promise.resolve();
    const modules = Object.entries(this.planSelection).filter(([, v]) => v).map(([k]) => k);
    this.planEditing.set(null);
    return this.run(() => firstValueFrom(this.api.setPlanModules(p.id, modules)),
      modules.length ? `Módulos del plan «${p.name}» actualizados.` : `El plan «${p.name}» ya no restringe módulos.`);
  }
}
