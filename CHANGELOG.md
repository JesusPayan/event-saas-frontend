# Changelog — EasiAcc Events (frontend)

La versión técnica **1.1.0** corresponde al lanzamiento comercial **EasiAcc Events 1.0**.
Detalle conjunto con el backend, estado y riesgos: repositorio backend, `CHANGELOG.md` y `docs/PROJECT_STATUS.md`.

## [Sin publicar]

### Añadido
- Panel de plataforma sin necesidad de elegir empresa: Organizaciones, Roles de plataforma (con transferencia de
  propiedad), Categorías del catálogo y Auditoría; aceptación de invitaciones de plataforma (`/platform-invite`).
- Panel del promotor (`/promoter`): enlace de referido, prospectos y avance de altas. Registro con `?ref=`.
- Catálogo de servicios (`/catalog`), formulario de ofertas y proveedores (`/providers`).
- Cotización con partidas del catálogo: filtro por categoría, proveedor, unidad de cobro, precio pendiente y total
  confirmado; seguimiento de partidas en el detalle (importe acordado, confirmación y documentos).
- Portal del proveedor (`/provider/items`) y rol «Proveedor» en Miembros, con accesos temporales de solo lectura.

### Cambiado
- Calendario de eventos con el diseño estándar: encabezado y botones comunes, navegación del mes con flechas,
  día actual resaltado y eventos coloreados por estado; «+ Nuevo evento» solo con permiso de creación.
- Correo comercial `contacto@easiacc.com` en `BRAND.contactEmail`: activa «Solicitar una demostración» en la
  landing y el enlace «Contacto» en el pie y en las páginas legales.

## [1.1.0] — EasiAcc Events 1.0 (versión candidata)

### Añadido
- Identidad visual EasiAcc Events: logos SVG, favicon, íconos, manifiesto y `docs/BRAND_GUIDELINES.md` (#21).
- Landing comercial en `/` con planes desde `/api/v1/public/plans`, capturas reales y preguntas frecuentes;
  páginas `/privacidad` y `/terminos` (#23). Borradores legales en `docs/legal/`.
- Gestión de miembros, sesión persistente y recuperación de contraseña (#20).
- Resumen de inventario (`/inventory/dashboard`), recuperado de `master` (#22).
- Pantallas base estandarizadas con Tailwind/Flowbite (#19).

### Cambiado
- Idioma es-MX y moneda MXN por defecto en fechas y montos (#23).

### Corregido
- Dashboard sin próximos eventos (fechas sin zona horaria) (#23).
- Límites contables de 1 mostrados como «Incluido» (#23).
- Historial de `master` reconciliado con `development` (QA-RELEASE-01).

## [1.0.0] — 2026-11-23
Build de producción reparado, interfaz de suscripciones y panel global, imagen nginx con CSP/HSTS (#18).
