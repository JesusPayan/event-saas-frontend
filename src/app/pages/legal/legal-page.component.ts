import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { BRAND } from '../../core/brand';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo';

const TITLES: Record<string, string> = {
  privacy: 'Aviso de privacidad',
  terms: 'Términos y condiciones',
};

/**
 * Páginas legales públicas.
 *
 * Los textos definitivos requieren revisión legal (LFPDPPP para el aviso de privacidad).
 * Mientras no estén aprobados, esta página NO publica un borrador como si fuera vigente:
 * informa que el documento se publicará antes del lanzamiento. Los borradores para
 * revisión están en docs/legal/.
 */
@Component({
  standalone: true,
  imports: [RouterLink, BrandLogoComponent],
  template: `
    <main class="min-h-screen bg-[#F8FAFC] px-4 py-10">
      <div class="mx-auto max-w-3xl">
        <a routerLink="/" class="hover:no-underline"><app-brand-logo [size]="34" [showProduct]="true" /></a>
        <section class="card mt-6 p-8">
          <h1 class="page-title">{{ title() }}</h1>
          <p class="mt-4 text-gray-700">
            Estamos finalizando este documento con asesoría legal. Se publicará en esta página antes de que
            {{ brand.product }} esté disponible al público.
          </p>
          @if (brand.contactEmail) {
            <p class="mt-4 text-gray-700">Si tienes dudas, escríbenos a
              <a [href]="'mailto:' + brand.contactEmail" class="font-semibold">{{ brand.contactEmail }}</a>.</p>
          }
          <a routerLink="/" class="btn-secondary mt-8">Volver al inicio</a>
        </section>
      </div>
    </main>`,
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly brand = BRAND;
  readonly title = computed(() => TITLES[this.route.snapshot.data['doc'] as string] ?? 'Documento legal');
}
