import { test, expect } from '../fixtures/tenant';
import { randomUUID } from 'node:crypto';

const prefix = '/api/v1';
const unique = () => randomUUID().slice(0, 8);

async function createCommercialFlow(request: any, apiUrl: string, headers: Record<string,string>) {
  const tag = unique();
  const post = async (route: string, data: object) => {
    const response = await request.post(`${apiUrl}${prefix}${route}`, { headers, data });
    expect(response.status(), `${route}: ${await response.text()}`).toBe(201);
    return response.json();
  };
  const patch = async (route: string, data: object) => {
    const response = await request.patch(`${apiUrl}${prefix}${route}`, { headers, data });
    expect(response.status(), `${route}: ${await response.text()}`).toBe(200);
    return response.json();
  };

  const client = await post('/clients', {
    first_name: `Cliente E2E ${tag}`, last_name: 'Automatizado',
    email: `cliente-${tag}@example.test`, client_type: 'individual',
  });
  const start = new Date(Date.now() + 30 * 86400000);
  const end = new Date(start.getTime() + 6 * 3600000);
  const event = await post('/events', {
    client_id: client.id, name: `Evento E2E ${tag}`, event_type: 'social',
    starts_at: start.toISOString(), ends_at: end.toISOString(), estimated_guests: 50,
  });
  const quote = await post('/quotes', {
    client_id: client.id, event_id: event.id,
    items: [{ item_type: 'service', description: 'Servicio E2E',
      quantity: '1', unit_price: '10000.00', discount_amount: '0', tax_rate: '0' }],
  });
  await patch(`/quotes/${quote.id}/status`, { status: 'sent' });
  await patch(`/quotes/${quote.id}/status`, { status: 'accepted' });
  const contract = await post('/contracts', { quote_id: quote.id });
  const document = await post(`/contracts/${contract.id}/documents/finalize`, {});
  return { client, event, quote, contract, document };
}

test.describe('E2E-03 contrato real y seguridad', () => {
  test('E2E-03-01 cliente → evento → cotización → contrato → PDF final', async ({request, tenantA, apiUrl}) => {
    const flow = await createCommercialFlow(request, apiUrl, tenantA.headers);
    expect(flow.contract.quote_id).toBe(flow.quote.id);
    expect(flow.document.contract_id).toBe(flow.contract.id);
    expect(flow.document.is_final).toBe(true);
    expect(flow.document.sha256).toMatch(/^[a-f0-9]{64}$/i);

    const management = await request.get(
      `${apiUrl}${prefix}/contracts/${flow.contract.id}/signature-management`,
      { headers: tenantA.headers });
    expect(management.status(), await management.text()).toBe(200);
    const data = await management.json();
    expect(data.documents.some((d: any) => d.id === flow.document.id && d.is_final)).toBe(true);
  });

  test('E2E-03-02 contrato duplicado rechazado y pago prematuro bloqueado', async ({request, tenantA, apiUrl}) => {
    const flow = await createCommercialFlow(request, apiUrl, tenantA.headers);
    const duplicate = await request.post(`${apiUrl}${prefix}/contracts`, {
      headers: tenantA.headers, data: { quote_id: flow.quote.id } });
    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).error).toBe('contract_already_exists');

    const payment = await request.post(`${apiUrl}${prefix}/contracts/${flow.contract.id}/payments`, {
      headers: tenantA.headers,
      data: { amount: '1000.00', payment_type: 'advance',
        payment_method: 'transfer', reference: `E2E-${unique()}` } });
    expect([400, 409, 422]).toContain(payment.status());
  });

  test('E2E-03-03 otra empresa no puede leer contrato ni documento', async ({request, tenantA, tenantB, apiUrl}) => {
    const flow = await createCommercialFlow(request, apiUrl, tenantA.headers);
    for (const route of [
      `/contracts/${flow.contract.id}`,
      `/contracts/${flow.contract.id}/signature-management`,
    ]) {
      const response = await request.get(`${apiUrl}${prefix}${route}`, { headers: tenantB.headers });
      expect([403, 404]).toContain(response.status());
    }
    const finalization = await request.post(
      `${apiUrl}${prefix}/contracts/${flow.contract.id}/documents/finalize`,
      { headers: tenantB.headers });
    expect([403, 404]).toContain(finalization.status());
  });

  test('E2E-03-04 firma pública rechaza token inexistente', async ({request, apiUrl}) => {
    const response = await request.get(
      `${apiUrl}${prefix}/signatures/invitations/${'invalid-token-e2e-'.repeat(3)}`);
    expect([400, 404, 410]).toContain(response.status());
  });
});


test('E2E-03-05 invitación real y validación OTP mediante Mailpit', async ({request, tenantA, apiUrl}) => {
  test.setTimeout(60000);
  const mail = 'http://127.0.0.1:8025/api/v1';
  expect((await request.get(`${mail}/messages`)).ok()).toBeTruthy();
  const flow = await createCommercialFlow(request, apiUrl, tenantA.headers);
  const recipient = `firma-${randomUUID()}@example.test`;
  async function readMail(subject: string): Promise<string> {
    let found = '';
    await expect.poll(async () => {
      const r = await request.get(`${mail}/messages?limit=100`);
      if (!r.ok()) return false;
      const data = await r.json();
      const m = data.messages.find((v: any) => v.Subject === subject && v.To?.some((x: any) => x.Address === recipient));
      if (!m) return false;
      const detail = await request.get(`${mail}/message/${encodeURIComponent(m.ID)}`);
      if (!detail.ok()) return false;
      found = (await detail.json()).Text || '';
      return found.length > 0;
    }, {timeout:15000, message:'Expected email not received'}).toBe(true);
    return found;
  }
  const invitation = await request.post(`${apiUrl}${prefix}/contracts/${flow.contract.id}/signature-requests`, {
    headers:tenantA.headers, data:{document_id:flow.document.id, signer_role:'client', signer_name:'Cliente E2E', signer_email:recipient}
  });
  expect(invitation.status()).toBe(201);
  const invite = await invitation.json();
  const body = await readMail('Invitación para firmar contrato');
  const token = body.match(/\/sign\/([A-Za-z0-9_-]{32,256})\b/)?.[1];
  expect(Boolean(token), 'Invitation token missing').toBe(true);
  const details = await request.get(`${apiUrl}${prefix}/signatures/invitations/${token}`);
  expect(details.status()).toBe(200);
  expect(await details.json()).toMatchObject({request_id:invite.id, contract_id:flow.contract.id, document_id:flow.document.id, status:'pending'});
  const otpRequest = await request.post(`${apiUrl}${prefix}/signatures/otp/request`, {data:{token}});
  expect(otpRequest.status()).toBe(200);
  const otpMail = await readMail('Código de verificación para firmar tu contrato');
  const code = otpMail.match(/Tu código de verificación es:\s*([0-9]{6})\b/)?.[1];
  expect(Boolean(code), 'OTP missing').toBe(true);
  const wrong = code === '000000' ? '000001' : '000000';
  const invalid = await request.post(`${apiUrl}${prefix}/signatures/otp/verify`, {data:{token, code:wrong}});
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error).toBe('invalid_otp');
  const valid = await request.post(`${apiUrl}${prefix}/signatures/otp/verify`, {data:{token, code}});
  expect(valid.status()).toBe(200);
  expect(await valid.json()).toMatchObject({verified:true,status:'verified'});
  const replay = await request.post(`${apiUrl}${prefix}/signatures/otp/verify`, {data:{token,code}});
  expect(replay.status()).toBe(409);
});
