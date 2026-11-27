import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ModulesApiService, PlatformModule } from '../../../core/capabilities/modules-api.service';
import { BusinessType } from '../../../core/capabilities/capability.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

const ERRORS: Record<string, string> = {
  invalid_code: 'El código usa MAYÚSCULAS, números y guiones bajos (3 a 40).', code_taken: 'Ese código ya existe.',
  invalid_name: 'Escribe un nombre.', unknown_module: 'Módulo desconocido.',
};

/** MOD-01: catálogo de giros comerciales y sus plantillas versionadas de módulos. */
@Component({ standalone: true, imports: [PageHeaderComponent, FormsModule],
  templateUrl: './platform-business-types.component.html' })
export class PlatformBusinessTypesComponent {
  private readonly api = inject(ModulesApiService);
  readonly items = signal<BusinessType[]>([]);
  readonly modules = signal<PlatformModule[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly editing = signal<BusinessType | 'new' | null>(null);
  readonly template = signal<BusinessType | null>(null);
  form = { code: '', name: '', description: '', sort_order: 0, allows_custom_description: false };
  templateSelection: Record<string, boolean> = {};

  constructor() { void this.load(); }

  private fail(err: unknown, fallback: string): void {
    const code = err instanceof HttpErrorResponse ? err.error?.error : '';
    this.error.set(ERRORS[code] ?? fallback);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [types, modules] = await Promise.all([firstValueFrom(this.api.platformBusinessTypes()),
        firstValueFrom(this.api.platformModules())]);
      this.items.set(types.items);
      this.modules.set(modules.items.filter(m => m.configurable));
    } catch {
      this.error.set('No se pudieron cargar los giros.');
    } finally {
      this.loading.set(false);
    }
  }

  moduleNames(codes: string[] | null | undefined): string { return (codes ?? []).map(c => this.moduleName(c)).join(', '); }

  moduleName(code: string): string { return this.modules().find(m => m.code === code)?.name ?? code; }

  open(t: BusinessType | null): void {
    this.form = { code: t?.code ?? '', name: t?.name ?? '', description: t?.description ?? '',
      sort_order: t?.sort_order ?? 0, allows_custom_description: t?.allows_custom_description ?? false };
    this.error.set('');
    this.editing.set(t ?? 'new');
  }

  async save(): Promise<void> {
    const target = this.editing();
    this.busy.set(true);
    this.error.set('');
    try {
      const body = { name: this.form.name.trim(), description: this.form.description.trim() || null,
        sort_order: Number(this.form.sort_order) || 0, allows_custom_description: this.form.allows_custom_description };
      if (target === 'new') await firstValueFrom(this.api.createBusinessType({ ...body, code: this.form.code.trim() }));
      else if (target) await firstValueFrom(this.api.updateBusinessType(target.id, body));
      this.editing.set(null);
      this.message.set('Giro guardado.');
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible guardar el giro.');
    } finally {
      this.busy.set(false);
    }
  }

  async toggleActive(t: BusinessType): Promise<void> {
    try {
      await firstValueFrom(this.api.updateBusinessType(t.id, { is_active: !t.is_active }));
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible cambiar el estado.');
    }
  }

  openTemplate(t: BusinessType): void {
    this.templateSelection = {};
    (t.recommended_modules ?? []).forEach(code => this.templateSelection[code] = true);
    this.template.set(t);
  }

  async saveTemplate(): Promise<void> {
    const t = this.template();
    if (!t) return;
    this.busy.set(true);
    try {
      const modules = Object.entries(this.templateSelection).filter(([, v]) => v).map(([k]) => k);
      const r = await firstValueFrom(this.api.setTemplate(t.id, modules));
      this.message.set(`Plantilla de «${t.name}» actualizada a la versión ${r.template_version}. Las empresas existentes no cambian.`);
      this.template.set(null);
      await this.load();
    } catch (err) {
      this.fail(err, 'No fue posible guardar la plantilla.');
    } finally {
      this.busy.set(false);
    }
  }
}
