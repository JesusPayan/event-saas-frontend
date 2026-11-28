# Changelog — EasiAcc Events (frontend)

La versión técnica **1.1.0** corresponde al lanzamiento comercial **EasiAcc Events 1.0**.
Detalle conjunto con el backend, estado y riesgos: repositorio backend, `CHANGELOG.md` y `docs/PROJECT_STATUS.md`.

## [1.4.0] — Sin publicar

### Añadido
- **Finanzas** de la empresa (`/finance`) y **Finanzas de EasiAcc** (`/platform/finance`): totales por moneda,
  flujo neto registrado, filtros, paginación, exportación CSV, registro, corrección con motivo, anulación e historial de egresos.
- Organizaciones: detalle con estado administrativo y suscripción, desactivar/reactivar con motivo, eliminar (archivar)
  con confirmación del identificador, restaurar y filtro de archivadas.

## [1.3.0] — Sin publicar

### Añadido
- Asistente de configuración inicial en 6 pasos (`/onboarding`) con borrador, giros múltiples y vista previa del menú.
- Configuración → **Giros y módulos** (`/settings/modules`): giros, sugerencias, activar/desactivar módulos con
  aviso de operaciones en curso y dependencias.
- Menú lateral y panel adaptados a los módulos activos; aviso de solo lectura en módulos inactivos o fuera del plan.
- Plataforma: **Giros comerciales** (plantillas) y **Módulos y planes** (adopción, interruptor global, módulos por plan, banderas).
- Filtro por giro en Solicitudes de la red / catálogo de la red.

## [1.2.0] — 2026-11-27

### Añadido
- Panel de plataforma sin necesidad de elegir empresa: Organizaciones, Roles de plataforma (con transferencia de
  propiedad), Categorías del catálogo y Auditoría; aceptación de invitaciones de plataforma (`/platform-invite`).
- Panel del promotor (`/promoter`): enlace de referido, prospectos y avance de altas. Registro con `?ref=`.
- Catálogo de servicios (`/catalog`), formulario de ofertas y proveedores (`/providers`).
- Cotización con partidas del catálogo: filtro por categoría, proveedor, unidad de cobro, precio pendiente y total
  confirmado; seguimiento de partidas en el detalle (importe acordado, confirmación y documentos).
- Portal del proveedor (`/provider/items`) y rol «Proveedor» en Miembros, con accesos temporales de solo lectura.
- Catálogo compartido entre organizaciones: «Compartir en el catálogo de la red» en las ofertas, pestaña «Catálogo
  de la red», servicios de otras organizaciones en la cotización (costo, precio de venta y margen) y bandeja
  «Solicitudes de la red» (`/network/requests`).

### Cambiado
- El panel global de plataforma ya no exige elegir empresa; cada página exige su permiso de plataforma.

## [1.1.2] — 2026-11-25

### Cambiado
- Calendario de eventos con el diseño estándar: encabezado y botones comunes, navegación del mes con flechas,
  día actual resaltado y eventos coloreados por estado; «+ Nuevo evento» solo con permiso de creación.

## [1.1.1] — 2026-11-25

### Cambiado
- Correo comercial `contacto@easiacc.com` en `BRAND.contactEmail`: activa «Solicitar una demostración» en la
  landing y el enlace «Contacto» en el pie y en las páginas legales.

## [1.1.0] — 2026-11-24 — EasiAcc Events 1.0

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
