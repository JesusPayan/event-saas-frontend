import { Component, computed, input } from '@angular/core';
import { BRAND } from '../../../core/brand';

/**
 * Logotipo de EasiAcc: isotipo (E estilizada) + marca «easiacc».
 * - tone: 'light' para fondos claros, 'dark' para el sidebar azul marino.
 * - showProduct: añade la línea de producto («Events») bajo la marca.
 */
@Component({
  selector: 'app-brand-logo',
  standalone: true,
  host: { class: 'inline-flex items-center gap-3' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64" aria-hidden="true" focusable="false" class="shrink-0">
      <rect width="64" height="64" rx="15" fill="#2563EB" />
      <rect x="17" y="16" width="8" height="32" rx="4" fill="#FFFFFF" />
      <rect x="17" y="16" width="30" height="8" rx="4" fill="#FFFFFF" />
      <rect x="17" y="28" width="20" height="8" rx="4" fill="#FFFFFF" />
      <rect x="17" y="40" width="30" height="8" rx="4" fill="#FFFFFF" />
      <circle cx="44" cy="32" r="4" fill="#60A5FA" />
    </svg>
    @if (showText()) {
      <span class="leading-tight">
        <span class="block font-bold tracking-tight" [style.font-size.px]="textSize()" [attr.aria-label]="brand.name">
          <span [class]="tone() === 'dark' ? 'text-white' : 'text-[#0F172A]'">easi</span><span [class]="tone() === 'dark' ? 'text-[#60A5FA]' : 'text-[#2563EB]'">acc</span>
        </span>
        @if (showProduct()) {
          <span class="block text-[11px] font-semibold uppercase tracking-[0.18em]"
            [class]="tone() === 'dark' ? 'text-slate-400' : 'text-slate-500'">{{ brand.productLine }}</span>
        }
      </span>
    }
  `,
})
export class BrandLogoComponent {
  readonly tone = input<'light' | 'dark'>('light');
  readonly size = input(40);
  readonly showText = input(true);
  readonly showProduct = input(false);
  readonly brand = BRAND;
  readonly textSize = computed(() => Math.round(this.size() * 0.62));
}
