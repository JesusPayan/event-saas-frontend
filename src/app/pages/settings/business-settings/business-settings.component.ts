import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { ModulesApiService } from '../../../core/capabilities/modules-api.service';
import {
  BusinessType, BusinessTypeSelection, MODULE_ERRORS, TenantModule,
} from '../../../core/capabilities/capability.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', disabled: 'Inactivo', plan_locked: 'Requiere mejorar el plan',
  dependency_missing: 'Falta una dependencia', unavailable: 'No disponible',
};
const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-green-100 text-green-800', disabled: 'bg-gray-100 text-gray-700',
  plan_locked: 'bg-amber-100 text-amber-800', dependency_missing: 'bg-amber-100 text-amber-800',
  unavailable: 'bg-gray-100 text-gray-500',
};

interface Blocker { module: string; operations: { type: string; count: number; message: string }[]; dependents: string[]; }

/** MOD-01: giros comerciales y módulos de la empresa (configuración posterior al registro). */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule, RouterLink],
  templateUrl: './business-settings.component.html' })
export class BusinessSettingsComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(ModulesApiService);
  readonly types = signal<BusinessType[]>([]);
  readonly selection = signal<BusinessTypeSelection[]>([]);
  readonly modules = signal<TenantModule[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly blocker = signal<Blocker | null>(null);
  readonly suggestion = signal<string[]>([]);
  readonly statusLabels = STATUS_LABELS;
  readonly statusClasses = STATUS_CLASSES;
  readonly canManage = computed(() => this.auth.hasPermission('members.manage'));
  readonly onboardingPending = computed(() => {
    const o = this.auth.capabilities()?.onboarding;
    return o === 'legacy' || o === 'pending' || o === 'in_progress';
  });

  constructor() { void this.load(); }

  private fail(err: unknown, fallback: string): void {
    const code = err instanceof HttpErrorResponse ? err.error?.error : '';
    this.error.set(MODULE_ERRORS[code] ?? fallback);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [types, current, modules] = await Promise.all([
        firstValueFrom(this.api.businessTypes()), firstValueFrom(this.api.tenantBusinessTypes()),
        firstValueFrom(this.api.tenantModules())]);
      this.types.set(types.items);
      this.selection.set(current.items.filter(t => !t.is_internal)
        .map(t => ({ code: t.code, is_primary: t.is_primary, custom_description: t.custom_description })));
      this.modules.set(modules.items);
    } catch {
      this.error.set('No se pudo cargar la configuración.');
    } finally {
      this.loading.set(false);
    }
  }

  isSelected(code: string): boolean { return this.selection().some(s => s.code === code); }

  toggleType(code: string): void {
    const current = this.selection();
    if (this.isSelected(code)) {
      const rest = current.filter(s => s.code !== code);
      if (rest.length && !rest.some(s => s.is_primary)) rest[0] = { ...rest[0], is_primary: true };
      this.selection.set(rest);
    } else {
      this.selection.set([...current, { code, is_primary: current.length === 0, custom_description: null }]);
    }
  }

  setPrimary(code: string): void { this.selection.set(this.selection().map(s => ({ ...s, is_primary: s.code === code }))); }

  setOther(value: string): void {
    this.selection.set(this.selection().map(s => s.code === 'OTHER' ? { ...s, custom_description: value } : s));
  }

  otherDescription(): string { return this.selection().find(s => s.code === 'OTHER')?.custom_description ?? ''; }

  typeName(code: string): string { return this.types().find(t => t.code === code)?.name ?? code; }

  moduleNames(codes: string[] | null | undefined): string { return (codes ?? []).map(c => this.moduleName(c)).join(', '); }

  moduleName(code: string): string { return this.modules().find(m => m.code === code)?.name ?? code; }

  /** Guarda los giros sin tocar módulos; después ofrece activar los recomendados que falten. */
  async saveTypes(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const items = this.selection().map(s => ({ code: s.code, is_primary: s.is_primary,
        ...(s.code === 'OTHER' ? { custom_description: s.custom_description ?? '' } : {}) }));
      const r = await firstValueFrom(this.api.setBusinessTypes(items, false));
      const active = new Set(this.modules().filter(m => m.enabled).map(m => m.code));
      this.suggestion.set(r.recommended.filter(code => !active.has(code)));
      this.message.set('Giros guardados. Tus módulos no cambiaron.');
    } catch (err) {
      this.fail(err, 'No fue posible guardar los giros.');
    } finally {
      this.busy.set(false);
    }
  }

  async applySuggestion(): Promise<void> {
    const changes: Record<string, boolean> = {};
    this.suggestion().forEach(code => changes[code] = true);
    await this.change(changes, 'Módulos recomendados activados.');
    this.suggestion.set([]);
  }

  async toggleModule(m: TenantModule): Promise<void> {
    this.blocker.set(null);
    if (m.enabled) {
      // Antes de deshabilitar, mostramos qué lo impide (operaciones o dependencias).
      const impact = await firstValueFrom(this.api.moduleImpact(m.code));
      if (impact.operations.length || impact.dependents.length) {
        this.blocker.set({ module: m.code, operations: impact.operations, dependents: impact.dependents });
        return;
      }
    }
    await this.change({ [m.code]: !m.enabled }, m.enabled ? `${m.name} quedó inactivo. Sus datos se conservan.`
      : `${m.name} quedó activo.`);
  }

  private async change(changes: Record<string, boolean>, ok: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const r = await firstValueFrom(this.api.setModules(changes));
      this.modules.set(r.items);
      await firstValueFrom(this.auth.loadCapabilities());
      const auto = r.result.auto_enabled.map(c => this.moduleName(c));
      this.message.set(auto.length ? `${ok} También se activó: ${auto.join(', ')}.` : ok);
    } catch (err) {
      this.fail(err, 'No fue posible actualizar los módulos.');
    } finally {
      this.busy.set(false);
    }
  }
}
