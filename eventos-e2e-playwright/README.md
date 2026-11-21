# E2E-03 — Integración inicial verificada contra código fuente

Se inspeccionaron `backend-e2e03.zip`, `frontend-e2e03.zip` y `e2e03-complementos.zip`.

## Instalación

Copiar `e2e/specs/commercial-signing.api.spec.ts` a:
`event-saas-frontend/eventos-e2e-playwright/e2e/specs/`

No sustituir fixtures, configuración ni pruebas existentes.

## Ejecución en CMD

Verificar primero que Flask en puerto 5000 use una base **descartable y aislada** como `crm_events_test`, con migraciones actualizadas. Angular puede seguir en 4200.

```
cd C:\DEV\crm-events\eventos-saas\event-saas-frontend
set E2E_ALLOW_WRITES=yes
npm run e2e -- --grep E2E-03
npm run e2e
```

## Alcance real

Cuatro pruebas de API: recorrido hasta documento contractual final, contrato duplicado, pago antes de activación, aislamiento entre empresas y token público inválido.

**No automatiza aún OTP, firmas de ambas partes, activación, pagos confirmados ni SHA-256 de recibos.**

La implementación de `app.services.email_service` envía mediante SMTP real; `signature_delivery_service` envía por ese servicio y no expone el token en la respuesta. No es seguro ni correcto leer hashes de tokens en MySQL o desactivar verificaciones para las pruebas.

Siguiente paso: integrar un transporte de correo E2E local (por ejemplo Mailpit) mediante configuración explícita para entorno test, capturar de allí los enlaces y OTP y verificar la firma de ambas partes. Antes de activar ese flujo, confirmar reglas de firma, credenciales SMTP de prueba y endpoints con una ejecución real.

## Seguridad

No ejecutar con `crm_events_dev` ni producción. El guard `E2E_ALLOW_WRITES=yes` no comprueba la conexión efectiva del servidor: verificarla por separado. Nunca incluir credenciales o tokens en logs y reportes.

## GitHub

Crear rama `feature/E2E-03-commercial-signing`, revisar diff, ejecutar pruebas y build, commit, push, PR, CI y merge protegido a `development`.
