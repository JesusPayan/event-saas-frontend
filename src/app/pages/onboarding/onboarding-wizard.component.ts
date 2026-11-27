import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { BRAND } from '../../core/brand';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo';
import { AuthService } from '../../services/auth.service';
import { ModulesApiService } from '../../core/capabilities/modules-api.service';
import {
  BusinessType, BusinessTypeSelection, MODULE_ERRORS, OnboardingPreview, PreviewModule,
} from '../../core/capabilities/capability.models';

const STEPS = ['Bienvenida', 'Tu empresa', 'Giros', 'Módulos', 'Vista previa', 'Listo'];

/** MOD-01: asistente de configuración inicial por empresa (se puede pausar y continuar). */
@Component({ standalone: true, imports: [BrandLogoComponent, FormsModule], templateUrl: './onboarding-wizard.component.html' })
export class OnboardingWizardComponent {
  readonly brand = BRAND;
  readonly auth = inject(AuthService);
  private readonly api = inject(ModulesApiService);
  private readonly router = inject(Router);
  readonly steps = STEPS;
  readonly step = signal(1);
  readonly types = signal<BusinessType[]>([]);
  readonly selected = signal<BusinessTypeSelection[]>([]);
  readonly preview = signal<OnboardingPreview | null>(null);
  readonly modules = signal<Record<string, boolean>>({});
  readonly busy = signal(false);
  readonly error = signal('');
  readonly loading = signal(true);
  readonly filteredTypes = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    return this.types().filter(t => !q || t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q));
  });
  readonly searchTerm = signal('');
  readonly primary = computed(() => this.selected().find(s => s.is_primary)?.code ?? null);
  readonly otherSelected = computed(() => this.selected().some(s => s.code === 'OTHER'));
  readonly canContinueTypes = computed(() => this.selected().length > 0 && !!this.primary()
    && (!this.otherSelected() || !!this.selected().find(s => s.code === 'OTHER')?.custom_description?.trim()));

  constructor() { void this.init(); }

  private async init(): Promise<void> {
    try {
      const [types, status] = await Promise.all([
        firstValueFrom(this.api.businessTypes()), firstValueFrom(this.api.onboardingStatus())]);
      this.types.set(types.items);
      if (status.status === 'completed') {
        await this.router.navigate(['/dashboard']);
        return;
      }
      if (status.draft) {
        this.selected.set(status.draft.business_types ?? []);
        this.modules.set(status.draft.modules ?? {});
        this.step.set(Math.min(Math.max(status.draft.step ?? 1, 1), 5));
        if (this.step() >= 4) await this.refreshPreview(false);
      } else if (status.status === 'legacy') {
        // Empresa anterior a v1.3.0: parte de los módulos que ya usa.
        const caps = this.auth.capabilities();
        const current: Record<string, boolean> = {};
        caps?.modules.filter(m => m.configurable).forEach(m => current[m.code] = m.enabled);
        this.modules.set(current);
      }
    } catch {
      this.error.set('No se pudo cargar el asistente.');
    } finally {
      this.loading.set(false);
    }
  }

  isSelected(code: string): boolean { return this.selected().some(s => s.code === code); }

  toggleType(t: BusinessType): void {
    const current = this.selected();
    if (this.isSelected(t.code)) {
      const rest = current.filter(s => s.code !== t.code);
      if (rest.length && !rest.some(s => s.is_primary)) rest[0] = { ...rest[0], is_primary: true };
      this.selected.set(rest);
    } else {
      this.selected.set([...current, { code: t.code, is_primary: current.length === 0, custom_description: null }]);
    }
  }

  setPrimary(code: string): void {
    this.selected.set(this.selected().map(s => ({ ...s, is_primary: s.code === code })));
  }

  setOtherDescription(value: string): void {
    this.selected.set(this.selected().map(s => s.code === 'OTHER' ? { ...s, custom_description: value } : s));
  }

  typeName(code: string): string { return this.types().find(t => t.code === code)?.name ?? code; }

  private payload(): BusinessTypeSelection[] {
    return this.selected().map(s => ({ code: s.code, is_primary: s.is_primary,
      ...(s.code === 'OTHER' ? { custom_description: s.custom_description ?? '' } : {}) }));
  }

  /** Recalcula recomendaciones. ``reset`` aplica los módulos recomendados como selección. */
  async refreshPreview(reset: boolean): Promise<void> {
    const body = reset || !Object.keys(this.modules()).length
      ? { business_types: this.payload() }
      : { business_types: this.payload(), modules: this.modules() };
    const preview = await firstValueFrom(this.api.preview(body));
    this.preview.set(preview);
    const next: Record<string, boolean> = {};
    preview.modules.filter(m => m.state === 'selected' || m.state === 'available')
      .forEach(m => next[m.code] = m.state === 'selected');
    this.modules.set(next);
  }

  async toggleModule(m: PreviewModule): Promise<void> {
    if (m.state === 'essential' || m.state === 'requires_upgrade' || m.state === 'coming_soon') return;
    const next = { ...this.modules(), [m.code]: !this.modules()[m.code] };
    // Al quitar un módulo, también se quitan los que dependen de él.
    if (!next[m.code]) {
      this.preview()?.modules.filter(x => x.depends_on.includes(m.code)).forEach(x => next[x.code] = false);
    }
    this.modules.set(next);
    await this.refreshPreview(false);
  }

  moduleName(code: string): string { return this.preview()?.modules.find(m => m.code === code)?.name ?? code; }

  moduleNames(codes: string[]): string { return codes.map(c => this.moduleName(c)).join(', '); }

  otherDescription(): string { return this.selected().find(s => s.code === 'OTHER')?.custom_description ?? ''; }

  selectedSummary(): string {
    return this.selected().map(s => this.typeName(s.code) + (s.is_primary ? ' (principal)' : '')).join(', ');
  }

  upgradeNeeded(): boolean {
    return (this.preview()?.modules ?? []).some(m => m.state === 'requires_upgrade' && m.recommended);
  }

  async go(target: number): Promise<void> {
    this.error.set('');
    if (target === 4 && this.step() === 3) {
      this.busy.set(true);
      try { await this.refreshPreview(true); } finally { this.busy.set(false); }
    }
    this.step.set(target);
    if (target >= 2 && target <= 5) {
      // Guarda el progreso para continuar después.
      firstValueFrom(this.api.saveDraft({ business_types: this.payload(), modules: this.modules(), step: target }))
        .catch(() => undefined);
    }
  }

  async finish(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.complete({ business_types: this.payload(), modules: this.modules() }));
      await firstValueFrom(this.auth.loadCapabilities());
      this.step.set(6);
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? err.error?.error : '';
      this.error.set(MODULE_ERRORS[code] ?? 'No fue posible guardar la configuración. Revisa tu selección.');
    } finally {
      this.busy.set(false);
    }
  }

  goDashboard(): void { void this.router.navigate(['/dashboard']); }
}
