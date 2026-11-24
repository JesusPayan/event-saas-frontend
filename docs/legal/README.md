# Documentos legales — borradores para revisión

> **No publicar sin revisión de un abogado.** Estos borradores describen el funcionamiento real de la
> plataforma para facilitar la revisión legal; no constituyen asesoría jurídica. Los textos entre
> `[corchetes]` deben completarse.

| Documento | Ruta pública | Estado |
|---|---|---|
| Aviso de privacidad (`AVISO_PRIVACIDAD_BORRADOR.md`) | `/privacidad` | Borrador. La página indica que se publicará antes del lanzamiento |
| Términos y condiciones (`TERMINOS_BORRADOR.md`) | `/terminos` | Borrador. Igual |

## Puntos que el abogado debe validar

1. **Normativa vigente.** En 2025 se publicó una nueva Ley Federal de Protección de Datos Personales en
   Posesión de los Particulares (LFPDPPP) y cambió la autoridad competente. Confirmar los requisitos del
   aviso y la autoridad ante la que se ejercen los derechos ARCO.
2. **Doble papel de EasiAcc:**
   - **Responsable** de los datos de sus clientes directos: empresas suscritas y sus usuarios.
   - **Encargado** de los datos que cada empresa registra sobre *sus* clientes (nombres, teléfonos,
     direcciones, firmas). En ese caso el responsable es la empresa usuaria, y los términos deben incluir
     las cláusulas de encargo (tratamiento por cuenta del responsable, confidencialidad, borrado al
     terminar).
3. **Proveedores y transferencias:** infraestructura (Linode/Akamai, servidores en EE. UU.), Mercado Pago
   (pagos), Cloudflare (DNS) y el proveedor de correo transaccional.
4. **Firma electrónica:** alcance probatorio de la firma simple con verificación por código (Código de
   Comercio y NOM-151 si se requiere conservación de mensajes de datos).
5. **Comprobantes no fiscales:** la plataforma no emite CFDI.
6. **Datos de contacto** del responsable y del departamento de datos personales.

Cuando estén aprobados, se publican en las páginas `/privacidad` y `/terminos`
(`src/app/pages/legal/legal-page.component.ts`).
