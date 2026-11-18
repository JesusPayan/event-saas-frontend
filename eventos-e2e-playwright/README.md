# Eventos SaaS E2E — Playwright + TypeScript

## Prerrequisitos
- Backend Flask en `127.0.0.1:5000`, Angular en `127.0.0.1:4200` con proxy `/api`.
- **Base de datos separada `crm_events_e2e`**. Nunca ejecutar contra `crm_events_dev` ni producción: las pruebas registran empresas y escriben configuraciones.
- Ejecutar `flask db upgrade` apuntando a `crm_events_e2e` antes de comenzar. Confirmar la URI de conexión en el entorno del backend.

## Instalación (CMD, carpeta frontend)
Copiar `e2e/`, `playwright.config.ts`, `.env.example` y `.gitignore` (fusionar si existe) a la raíz del frontend. Incorporar scripts y devDependencies del `package.json` del paquete **sin reemplazar** el `package.json` existente.

```cmd
npm install -D @playwright/test dotenv
npx playwright install chromium
copy .env.example .env
npm run e2e:smoke
npm run e2e
npx playwright show-report
```

Scripts a fusionar: `"e2e":"playwright test"`, `"e2e:smoke":"playwright test --grep @smoke"`, `"e2e:report":"playwright show-report"`.

## Seguridad de los datos
Cada test que utiliza `tenantA` o `tenantB` registra empresas y usuarios aleatorios en la base aislada. No hay limpieza destructiva: recrear la base E2E mediante proceso controlado entre ejecuciones, nunca truncar tablas de un entorno compartido.

## Cobertura y límites
Implementado: AUTH-01/02/03/04/05/10, configuración PDF-01/02/03/04/05 y smoke de rutas UI. PDF-09/10/11/15 queda marcado como `skip` hasta crear un contrato y pago confirmado dentro del mismo tenant de prueba. La matriz completa de CRM, eventos, inventario, cotizaciones, contratos, logística y pagos requiere agregar factories API basadas en los contratos reales de esos endpoints y selectores de las pantallas; no se simula que esos flujos ya estén automatizados.

## GitHub CI
El workflow incluido es **manual y opt-in**: necesita una base E2E MySQL, secretos de configuración y arranque de ambos servidores. No habilitarlo como required check hasta integrar esos servicios. Se recomienda primero ejecutarlo localmente y luego añadir un job E2E a los PR contra `development`.
