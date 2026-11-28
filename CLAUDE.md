# CLAUDE.md — EasiAcc Events (frontend)

Contexto del proyecto para asistentes de código. El contexto general del producto, las reglas
del dueño y los pendientes de producción están en el `CLAUDE.md` del backend
(`JesusPayan/events-saas-backend`); aquí solo lo específico del frontend. Las reglas aplican igual.

## Producto
**EasiAcc Events** (siempre «EasiAcc», nunca «EasyAcc»): SaaS multi-tenant para empresas de eventos.
Este repositorio es la aplicación web Angular que consume la API Flask `/api/v1`.
Versión actual: **v1.4.0** (MOD-01 + FIN-01) en `development`; `master` = último release (v1.2.0).

## Stack
- Angular 20, componentes **standalone**, **signals**, control de flujo `@if/@for/@switch`.
- Tailwind CSS con clases utilitarias propias (`card`, `btn-primary`, `btn-secondary`, `form-control`,
  `form-label`, `alert-error`, `alert-success`, `page-title`, `page-subtitle`).
- Pruebas: `node --test tests/*.test.mjs` (pruebas estáticas de rutas/plantillas/servicios) y
  Playwright en `eventos-e2e-playwright/`.
- Marca centralizada en `src/app/core/brand.ts` y `shared/components/brand-logo`; manual en `docs/BRAND_GUIDELINES.md`.

## Estructura
```
src/app/
  app.routes.ts          rutas con guardas (authGuard, tenantGuard, permissionGuard, moduleGuard, onboardingGuard, platformGuard)
  core/brand.ts          nombre, colores y textos de marca
  core/capabilities/     modelos y ModulesApiService de MOD-01 (giros, módulos, onboarding, plataforma)
  services/              un servicio HTTP por dominio + auth.service / auth.guard / auth.interceptor
  layout/sidebar/        admin-layout (banner de solo lectura) y sidebar (menú según permisos y módulos)
  pages/                 una carpeta por dominio (clients, events, quotes, contracts, inventory, logistics,
                         catalog, billing, members, platform, onboarding, settings, finance, legal…)
  shared/components/     page-header, data-table, pagination, empty-state, stat-card, brand-logo
tests/*.test.mjs         pruebas con node:test
docs/legal/              borradores de aviso de privacidad y términos (pendientes de revisión legal)
```

## Conceptos clave
- `AuthService` (signals): usuario, empresa activa (`tenant`), permisos (`hasPermission`), permisos de
  plataforma y **capacidades** (`capabilities`, `hasModule`, `moduleStatus`) cargadas tras elegir empresa.
- El interceptor agrega el token y `X-Tenant-ID`. El servidor decide el acceso; el frontend solo
  oculta o muestra. Nunca dependas de ocultar un botón como medida de seguridad.
- **MOD-01**: `moduleGuard(code)` solo bloquea módulos no disponibles; un módulo inactivo o fuera del
  plan se puede consultar en solo lectura (banner en el layout). Errores del servidor se traducen con
  `MODULE_ERRORS`. Nuevas pantallas de un módulo opcional: agregar `moduleGuard`, condición en el
  sidebar (`hasModule`) y, si es widget del panel, registrarlo en `DASHBOARD_WIDGETS`.
- **FIN-01**: `pages/finance/finance-page.component` sirve a `/finance` (empresa) y `/platform/finance` (plataforma)
  según `data.scope`; `FinanceService` nunca envía `tenant_id` en el alcance de empresa. Organizaciones
  (`/platform/organizations`) administra desactivar, archivar y restaurar con motivo.
- Las plantillas de Angular no aceptan funciones flecha en bindings: usa métodos del componente.
- Textos de interfaz en español de México.

## Desarrollo
```bash
npm ci
npm start              # ng serve con proxy /api → http://127.0.0.1:5000 (backend local)
npm test               # 27 pruebas (v1.4.0)
npm run build          # build de producción (solo existe una advertencia CSS conocida de 2 reglas)
```
- Demo pública (`demo.easiacc.com` vía Cloudflare Tunnel): `ng serve --allowed-hosts` y regla de
  caché «bypass» en Cloudflare para evitar `main.js` desactualizado.
- `eventos-e2e-playwright/e2e/specs/crm-api-backend` está registrado como submódulo sin `.gitmodules`;
  no lo modifiques ni lo borres sin acordarlo.
- No versionar `.angular/cache/`, `dist/`, `node_modules/`, `test-results/`, `playwright-report/`.

## Flujo de trabajo y Git
- Ramas `feature/<ID>-<descripcion>` desde `development` → PR a `development` → release a `master` → tag (los crea el dueño).
- Autor: `Jesus Payan <JesusPayan@users.noreply.github.com>`; mensajes en español (`feat(ID): …`).
- Actualizar `CHANGELOG.md` en cada cambio funcional.
- **No hacer commit, push, PR ni merge sin autorización explícita del dueño.** No force push,
  `git reset --hard` ni `git clean -fd` sin aprobación. No subir secretos ni `.env`.
- No inventar funcionalidades, precios, testimonios ni estadísticas; no afirmar pruebas no ejecutadas.
