import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:5000';
if (process.env.E2E_ALLOW_WRITES !== 'yes') {
  // Fail closed: these tests create tenants and write records.
  throw new Error('Set E2E_ALLOW_WRITES=yes only when using an isolated E2E database.');
}

export type TenantSession = { email: string; password: string; tenantId: number; token: string; headers: Record<string, string> };
async function registerTenant(request: APIRequestContext): Promise<TenantSession> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const email = `e2e-${suffix}@example.test`;
  const password = `E2e!${randomUUID()}Aa9`;
  const reg = await request.post(`${api}/api/v1/auth/register`, {
    data: { email, password, company_name: `E2E ${suffix}`, slug: `e2e-${suffix}` },
  });
  expect(reg.ok(), `Registration failed: ${reg.status()} ${await reg.text()}`).toBeTruthy();
  const login = await request.post(`${api}/api/v1/auth/login`, { data: { email, password } });
  expect(login.ok(), `Login failed: ${login.status()} ${await login.text()}`).toBeTruthy();
  const { access_token: token } = await login.json();
  const authHeaders = { Authorization: `Bearer ${token}` };
  const me = await request.get(`${api}/api/v1/auth/me`, { headers: authHeaders });
  expect(me.ok()).toBeTruthy();
  const body = await me.json();
  const tenantId = body.tenants?.[0];
  expect(typeof tenantId).toBe('number');
  return { email, password, tenantId, token, headers: { ...authHeaders, 'X-Tenant-ID': String(tenantId) } };
}

type Fixtures = { e2eGuard: void; tenantA: TenantSession; tenantB: TenantSession; apiUrl: string };
export const test = base.extend<Fixtures>({
  apiUrl: [api, { option: true }],
  e2eGuard: [async ({ request, apiUrl }, use) => {
    const response = await request.get(`${apiUrl}/api/v1/e2e/readiness`, { maxRedirects: 0 });
    expect(response.status(), 'Isolated E2E server required').toBe(200);
    expect(await response.json()).toEqual({status:'ready', environment:'test', database:'crm_events_test'});
    await use();
  }, { auto: true }],
  tenantA: async ({ request, e2eGuard }, use) => { await use(await registerTenant(request)); },
  tenantB: async ({ request, e2eGuard }, use) => { await use(await registerTenant(request)); },
});
export { expect };
