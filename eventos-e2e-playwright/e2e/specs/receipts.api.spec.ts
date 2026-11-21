import { test, expect } from '../fixtures/tenant';
import { PNG } from 'pngjs';

const path = '/api/v1/company/receipt-settings';
test('@smoke PDF-01/02/05 company receipt settings persist', async ({ request, tenantA, apiUrl }) => {
  const payload = { commercial_name: 'Empresa E2E A', contact_email: 'contacto@example.test', phone: '6690000000', address: 'Domicilio ficticio E2E', timezone: 'America/Mazatlan' };
  const update = await request.patch(`${apiUrl}${path}`, { headers: tenantA.headers, data: payload });
  expect(update.status(), await update.text()).toBe(200);
  const read = await request.get(`${apiUrl}${path}`, { headers: tenantA.headers });
  expect(read.status()).toBe(200);
  expect(await read.json()).toMatchObject(payload);
});

test('PDF-05 invalid timezone rejected', async ({ request, tenantA, apiUrl }) => {
  const response = await request.patch(`${apiUrl}${path}`, { headers: tenantA.headers, data: { timezone: 'Invalid/Timezone' } });
  expect(response.status()).toBe(400);
});

test('PDF-04 non-image logo rejected', async ({ request, tenantA, apiUrl }) => {
  const response = await request.put(`${apiUrl}${path}/logo`, {
    headers: tenantA.headers,
    multipart: { logo: { name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') } },
  });
  expect(response.status()).toBe(400);
});

test('PDF-03 valid PNG upload and retrieve', async ({ request, tenantA, apiUrl }) => {
  // 1x1 valid PNG. Test the server sanitization and MIME type.
  const image = new PNG({ width: 2, height: 2 });

for (let i = 0; i < image.data.length; i += 4) {
  image.data[i] = 30;       // Rojo
  image.data[i + 1] = 100;   // Verde
  image.data[i + 2] = 220;   // Azul
  image.data[i + 3] = 255;   // Opacidad
}

const png = PNG.sync.write(image);
  const upload = await request.put(`${apiUrl}${path}/logo`, { headers: tenantA.headers, multipart: { logo: { name: 'e2e.png', mimeType: 'image/png', buffer: png } } });
  expect(upload.status(), await upload.text()).toBe(200);
  const download = await request.get(`${apiUrl}${path}/logo`, { headers: tenantA.headers });
  expect(download.status()).toBe(200);
  expect(download.headers()['content-type']).toContain('image/png');
  expect((await download.body()).length).toBeGreaterThan(0);
});
