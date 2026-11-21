/** Reusable real-API fixture. NEVER use against development/production. */
import { expect, type APIRequestContext } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import type { TenantSession } from './tenant';

const root = '/api/v1';
const mailpit = process.env.E2E_MAILPIT_API_URL ?? 'http://127.0.0.1:8025/api/v1';
const uuid = () => randomUUID().replaceAll('-', '').slice(0, 12);
// Original black-ink PNG signature, 200x80; generated in tests, not copied from users.
// Its opaque stroke is checked by the backend (a white/transparent image is rejected).
const signaturePng = process.env.E2E_SIGNATURE_PNG_BASE64;

export class CommercialFactory {
  constructor(readonly request: APIRequestContext, readonly apiUrl: string, readonly tenant: TenantSession) {}
  private url(path: string) { return `${this.apiUrl}${root}${path}`; }
  private async call(method: 'post'|'patch', path: string, data: object, status: number) {
    const response = await this.request[method](this.url(path), { headers: this.tenant.headers, data });
    expect(response.status(), `${method.toUpperCase()} ${path}: ${await response.text()}`).toBe(status);
    return response.json();
  }
  async createContract() {
    const tag = uuid();
    const client = await this.call('post', '/clients', {first_name:`Cliente ${tag}`,last_name:'E2E',email:`client-${tag}@example.test`,client_type:'individual'}, 201);
    const start = new Date(Date.now()+30*86400000);
    const event = await this.call('post','/events',{client_id:client.id,name:`Evento ${tag}`,event_type:'social',starts_at:start.toISOString(),ends_at:new Date(start.getTime()+6*3600000).toISOString(),estimated_guests:50},201);
    const quote = await this.call('post','/quotes',{client_id:client.id,event_id:event.id,items:[{item_type:'service',description:'Servicio E2E',quantity:'1',unit_price:'10000.00',discount_amount:'0',tax_rate:'0'}]},201);
    await this.call('patch',`/quotes/${quote.id}/status`,{status:'sent'},200);
    await this.call('patch',`/quotes/${quote.id}/status`,{status:'accepted'},200);
    const contract = await this.call('post','/contracts',{quote_id:quote.id},201);
    const document = await this.call('post',`/contracts/${contract.id}/documents/finalize`,{},201);
    return {client,event,quote,contract,document};
  }
  private async emailBody(recipient: string, subject: string, afterIds: Set<string>) {
    let text = '';
    await expect.poll(async () => {
      const r = await this.request.get(`${mailpit}/messages?limit=100`);
      if (!r.ok()) return false;
      const {messages=[]} = await r.json();
      const m = messages.find((x:any)=>!afterIds.has(x.ID) && x.Subject===subject && x.To?.some((to:any)=>to.Address===recipient));
      if (!m) return false;
      const detail = await this.request.get(`${mailpit}/message/${encodeURIComponent(m.ID)}`);
      if (!detail.ok()) return false;
      text = (await detail.json()).Text ?? '';
      return text.length>0;
    },{timeout:15000,intervals:[150,300,500],message:`Mailpit email not received: ${subject}`}).toBe(true);
    return text;
  }
  private async mailIds() {
    const r = await this.request.get(`${mailpit}/messages?limit=100`);
    expect(r.ok(), 'Mailpit must be running').toBeTruthy();
    return new Set<string>(((await r.json()).messages ?? []).map((m:any)=>m.ID));
  }
  async sign(contractId: number, documentId: number, role:'client'|'provider') {
    const recipient = `sign-${role}-${uuid()}@example.test`;
    const signer = role==='client'?'Cliente E2E':'Proveedor E2E';
    const beforeInvitation = await this.mailIds();
    const invitation = await this.call('post',`/contracts/${contractId}/signature-requests`,{document_id:documentId,signer_role:role,signer_name:signer,signer_email:recipient},201);
    const body = await this.emailBody(recipient,'Invitación para firmar contrato - Eventos SaaS',beforeInvitation);
    const token = body.match(/\/sign\/([A-Za-z0-9_-]{32,256})\b/)?.[1];
    expect(token, 'Invitation token missing').toBeTruthy();
    const beforeOtp = await this.mailIds();
    const otp = await this.request.post(this.url('/signatures/otp/request'),{data:{token}});
    expect(otp.status(),await otp.text()).toBe(200);
    const otpBody = await this.emailBody(recipient,'Código de verificación para firmar tu contrato',beforeOtp);
    const code = otpBody.match(/Tu código de verificación es:\s*([0-9]{6})\b/)?.[1];
    expect(code,'OTP missing').toBeTruthy();
    const verify = await this.request.post(this.url('/signatures/otp/verify'),{data:{token,code}});
    expect(verify.status(),await verify.text()).toBe(200);
    if (!signaturePng) throw new Error('Set E2E_SIGNATURE_PNG_BASE64 to a generated nonblank PNG (200x80) before signature E2E. Do not use real signatures.');
    const signed = await this.request.post(this.url('/signatures/sign'),{data:{token,signature_data:`data:image/png;base64,${signaturePng}`,consent_accepted:true,signer_name:signer}});
    expect(signed.status(),await signed.text()).toBe(201);
    return {invitation, signature:await signed.json()};
  }
  async createSignedContract() {
    const flow = await this.createContract();
    const clientSignature = await this.sign(flow.contract.id,flow.document.id,'client');
    const providerSignature = await this.sign(flow.contract.id,flow.document.id,'provider');
    const contractResponse = await this.request.get(this.url(`/contracts/${flow.contract.id}`),{headers:this.tenant.headers});
    expect(contractResponse.status(),await contractResponse.text()).toBe(200);
    expect((await contractResponse.json()).status).toBe('active');
    return {...flow,clientSignature,providerSignature};
  }
  async createConfirmedPayment() {
    const flow = await this.createSignedContract();
    const payment = await this.call('post',`/contracts/${flow.contract.id}/payments`,{amount:'1000.00',payment_type:'advance',payment_method:'bank_transfer',reference:`E2E-${uuid()}`},201);
    const confirmed = await this.call('patch',`/contracts/${flow.contract.id}/payments/${payment.id}/confirm`,{},200);
    expect(confirmed.status).toBe('confirmed');
    return {...flow,payment:confirmed};
  }
  async receiptHash(contractId:number,paymentId:number) {
    const r=await this.request.get(this.url(`/contracts/${contractId}/payments/${paymentId}/receipt`),{headers:this.tenant.headers});
    expect(r.status(),await r.text()).toBe(200);
    expect(r.headers()['content-type']).toContain('application/pdf');
    const bytes=await r.body();
    expect(bytes.subarray(0,5).toString()).toBe('%PDF-');
    const hash=createHash('sha256').update(bytes).digest('hex');
    expect(r.headers()['x-receipt-sha256']).toBe(hash);
    return hash;
  }
}
