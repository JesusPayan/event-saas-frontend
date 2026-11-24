import { test, expect } from '../fixtures/tenant';
import { createHash } from 'node:crypto';

// Supply a confirmed payment in a dedicated E2E tenant; never use production IDs.
// This test is skipped until the contract/event fixture factory is wired.
test('PDF-09/10/11/15 receipt bytes remain immutable after company changes', async ({ request, tenantA, apiUrl }) => {
  const contractId = Number(process.env.E2E_CONTRACT_ID || 0);
  const paymentId = Number(process.env.E2E_PAYMENT_ID || 0);
  test.skip(!contractId || !paymentId, 'Requires confirmed payment fixture in the tenant created for this test');
  const receipt = `${apiUrl}/api/v1/contracts/${contractId}/payments/${paymentId}/receipt`;
  const first = await request.get(receipt, { headers: tenantA.headers });
  expect(first.status()).toBe(200);
  const bytes1 = await first.body();
  const update = await request.patch(`${apiUrl}/api/v1/company/receipt-settings`, { headers: tenantA.headers, data: { commercial_name: 'Changed AFTER issue' } });
  expect(update.status()).toBe(200);
  const second = await request.get(receipt, { headers: tenantA.headers });
  expect(second.status()).toBe(200);
  const bytes2 = await second.body();
  expect(createHash('sha256').update(bytes1).digest('hex')).toBe(createHash('sha256').update(bytes2).digest('hex'));
});
