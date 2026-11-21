import { test, expect } from '../fixtures/tenant';

test('@smoke AUTH-01/03 registration and login create isolated owner tenant', async ({ request, tenantA, apiUrl }) => {
  const me = await request.get(`${apiUrl}/api/v1/auth/me`, { headers: tenantA.headers });
  expect(me.status()).toBe(200);
  const body = await me.json();
  expect(body.email).toBe(tenantA.email);
  expect(body.tenants).toContain(tenantA.tenantId);
});

test('@smoke AUTH-04 invalid password is rejected', async ({ request, tenantA, apiUrl }) => {
  const response = await request.post(`${apiUrl}/api/v1/auth/login`, {
    data: { email: tenantA.email, password: 'incorrect-password' },
  });
  expect([400, 401, 403]).toContain(response.status());
});

test('AUTH-02 duplicate email is rejected', async ({ request, tenantA, apiUrl }) => {
  const response = await request.post(`${apiUrl}/api/v1/auth/register`, {
    data: { email: tenantA.email, password: tenantA.password, company_name: 'Duplicate tenant', slug: `duplicate-${Date.now()}` },
  });
  expect([400, 409, 422]).toContain(response.status());
});

test('AUTH-10 company settings cannot be read from another tenant', async ({ request, tenantA, tenantB, apiUrl }) => {
  const a = await request.patch(`${apiUrl}/api/v1/company/receipt-settings`, {
    headers: tenantA.headers, data: { commercial_name: 'E2E private company A' },
  });
  expect(a.status()).toBe(200);
  const b = await request.get(`${apiUrl}/api/v1/company/receipt-settings`, { headers: tenantB.headers });
  expect(b.status()).toBe(200);
  expect((await b.json()).commercial_name).not.toBe('E2E private company A');
});
