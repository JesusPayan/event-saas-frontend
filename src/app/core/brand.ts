/**
 * Identidad comercial de la plataforma (EasiAcc), en un solo lugar.
 *
 * Importante: es la marca de la PLATAFORMA. Los documentos y comunicaciones de cada
 * empresa cliente (cotizaciones, contratos, comprobantes) conservan la identidad de
 * esa empresa; EasiAcc aparece solo como la herramienta que los genera.
 * Escribir siempre «EasiAcc» (nunca «EasyAcc»).
 */
export const BRAND = {
  name: 'EasiAcc',
  product: 'EasiAcc Events',
  productLine: 'Events',
  tagline: 'Simplifica tu negocio.',
  secondaryTagline: 'Una plataforma. Infinitas posibilidades.',
  websiteUrl: 'https://easiacc.com',
  appUrl: 'https://app.easiacc.com',
} as const;

/** Paleta corporativa (también disponible como variables CSS --brand-* en styles.css). */
export const BRAND_COLORS = {
  navy: '#0F172A',
  primary: '#2563EB',
  secondary: '#60A5FA',
  background: '#F8FAFC',
  white: '#FFFFFF',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
} as const;
