# EasiAcc Events — Frontend (Angular 20)

> **EasiAcc** — *Simplifica tu negocio.* Marca centralizada en `src/app/core/brand.ts`; manual en `docs/BRAND_GUIDELINES.md`.

Aplicación standalone (Angular 20, Tailwind CSS 4, Flowbite) de EasiAcc Events, SaaS multiempresa para negocios de eventos.
Backend: repositorio `events-saas-backend` (documentación de despliegue y Mercado Pago en su carpeta `docs/`).

## Desarrollo

```cmd
npm ci
npm start            REM http://127.0.0.1:4200, proxy /api -> http://127.0.0.1:5000
```

## Pruebas y build

```cmd
npm test
npm run build -- --configuration production
```

`npm test` incluye verificaciones de que toda ruta lazy apunta a un componente existente y de que el checkout
nunca envía importes desde el navegador.

## Producción

`Dockerfile` construye la app y la sirve con nginx (`deploy/nginx.conf.template`):
SPA con fallback a `index.html`, `/api/` reenviado al backend (`API_UPSTREAM`, por defecto
`http://backend:5000`) en el mismo origen, y cabeceras de seguridad (CSP, HSTS, X-Frame-Options).
El TLS se termina en el proxy/CDN delante del contenedor (puerto 8080).

## Rutas principales

- Empresa: `/dashboard`, `/clients`, `/events`, `/quotes`, `/contracts`, `/inventory`, `/logistics`
- Suscripción: `/billing/plans`, `/billing/subscription`, `/billing/return`
- Panel global (solo operadores del backend): `/platform/prices`, `/platform/subscriptions`
- Firma pública de contratos: `/sign/:token`
