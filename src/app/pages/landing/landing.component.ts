import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BRAND } from '../../core/brand';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo';
import { FEATURE_LABELS, COUNTED_FEATURES } from '../billing/billing.service';

interface PublicPrice { billing_interval: 'month' | 'year'; amount: string; currency: string; }
interface PublicEntitlement { feature_code: string; limit_value: number | null; }
interface PublicPlan { code: string; name: string; description: string | null; prices: PublicPrice[]; entitlements: PublicEntitlement[]; }
interface PublicCatalog { plans: PublicPlan[]; free_tier: { name: string; description: string | null; entitlements: PublicEntitlement[] } | null; }

/**
 * Landing comercial de EasiAcc Events.
 * Regla: solo información real del producto. Los precios se leen de MySQL vía
 * /api/v1/public/plans; no hay testimonios, cifras ni funciones inventadas.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, BrandLogoComponent],
  templateUrl: './landing.component.html',
})
export class LandingComponent {
  private readonly http = inject(HttpClient);
  readonly brand = BRAND;
  readonly year = new Date().getFullYear();
  readonly featureLabels = FEATURE_LABELS;
  readonly interval = signal<'month' | 'year'>('month');
  readonly catalog = signal<PublicCatalog | null>(null);
  readonly plansError = signal(false);
  readonly menuOpen = signal(false);
  readonly openFaq = signal<number | null>(0);

  readonly contactHref = computed(() => this.brand.contactEmail
    ? `mailto:${this.brand.contactEmail}?subject=${encodeURIComponent('Quiero una demostración de EasiAcc Events')}` : '');

  readonly benefits = [
    { title: 'Todo en un solo lugar', text: 'Clientes, eventos, inventario, cotizaciones, contratos y pagos conectados entre sí. Sin hojas de cálculo sueltas.' },
    { title: 'Cotiza y cierra más rápido', text: 'Genera cotizaciones en PDF y conviértelas en contratos que tu cliente firma en línea desde su celular.' },
    { title: 'Control de tu inventario', text: 'Disponibilidad por fecha, reservas por evento, entregas, devoluciones, incidencias y cargos por daños.' },
    { title: 'Cobra con orden', text: 'Registra anticipos y pagos de cada contrato, consulta saldos y emite comprobantes en PDF.' },
  ];

  readonly features = [
    { title: 'Clientes', text: 'Cartera de clientes con búsqueda, historial y datos de contacto.' },
    { title: 'Eventos y calendario', text: 'Agenda de eventos con estados, ubicación y vista de calendario.' },
    { title: 'Inventario', text: 'Artículos, categorías, disponibilidad, reservas, movimientos, incidencias y reportes exportables.' },
    { title: 'Logística', text: 'Órdenes de preparación, despacho y entrega para cada evento.' },
    { title: 'Cotizaciones', text: 'Conceptos, impuestos y descuentos, con PDF listo para enviar.' },
    { title: 'Contratos y firma electrónica', text: 'Contratos en PDF con firma en línea verificada por código enviado al correo.' },
    { title: 'Pagos y comprobantes', text: 'Anticipos, abonos, saldos y comprobantes de pago con la identidad de tu empresa.' },
    { title: 'Tu equipo', text: 'Invita colaboradores con roles: Administrador, Operativo o Solo lectura.' },
  ];

  readonly screenshots = [
    { src: 'landing/dashboard.png', alt: 'Panel de control con indicadores y próximos eventos', caption: 'Panel de control' },
    { src: 'landing/eventos.png', alt: 'Listado de eventos con estados', caption: 'Eventos' },
    { src: 'landing/cotizacion.png', alt: 'Formulario de cotización con conceptos', caption: 'Cotizaciones' },
    { src: 'landing/inventario.png', alt: 'Inventario con existencias y precios de renta', caption: 'Inventario' },
  ];

  readonly faqs = [
    { q: '¿Necesito tarjeta para empezar?', a: 'No. Al registrar tu empresa empiezas con el plan Gratuito y sus funciones básicas. Contratas un plan cuando necesites ampliar los límites.' },
    { q: '¿Cómo se paga la suscripción?', a: 'Con Mercado Pago, de forma mensual o anual con cobro recurrente. La suscripción se activa cuando Mercado Pago confirma el pago.' },
    { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, desde «Mi suscripción». Se detienen los cobros y conservas el acceso hasta el final del periodo pagado; después tu empresa pasa al plan Gratuito.' },
    { q: '¿Mis clientes pueden firmar los contratos en línea?', a: 'Sí. Reciben un enlace privado, revisan el PDF y firman después de verificar un código enviado a su correo. Cada firma genera un comprobante.' },
    { q: '¿Puedo invitar a mi equipo?', a: 'Sí. Invitas por correo y eliges el rol de cada persona. El número de usuarios depende de tu plan.' },
    { q: '¿Mi información está separada de la de otras empresas?', a: 'Sí. Cada empresa solo puede ver y modificar sus propios datos.' },
    { q: '¿Emite facturas (CFDI)?', a: 'No. EasiAcc Events emite comprobantes de pago en PDF que no son comprobantes fiscales. La facturación electrónica se realiza por separado.' },
    { q: '¿Funciona en celular?', a: 'Sí. Funciona desde el navegador en computadora, tableta y celular, sin instalar nada.' },
  ];

  constructor() {
    this.http.get<PublicCatalog>('/api/v1/public/plans').subscribe({
      next: data => this.catalog.set(data),
      error: () => this.plansError.set(true),
    });
  }

  priceFor(plan: PublicPlan): PublicPrice | undefined {
    return plan.prices.find(p => p.billing_interval === this.interval());
  }

  monthlyEquivalent(price: PublicPrice): number {
    return price.billing_interval === 'year' ? Number(price.amount) / 12 : Number(price.amount);
  }

  limitLabel(limit: number | null, feature = ''): string {
    if (limit === null) return 'Ilimitado';
    if (limit === 0) return 'No incluido';
    if (limit === 1 && !COUNTED_FEATURES.has(feature)) return 'Incluido';
    return String(limit);
  }

  label(code: string): string {
    return this.featureLabels[code] ?? code;
  }

  toggleFaq(i: number): void {
    this.openFaq.update(v => (v === i ? null : i));
  }
}
