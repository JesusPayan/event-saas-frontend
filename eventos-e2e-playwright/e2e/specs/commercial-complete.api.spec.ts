import { test, expect } from '../fixtures/tenant';
import { CommercialFactory } from '../fixtures/commercial';

test('E2E-03-06/07/12 both signers activate the contract and payment is confirmed',async({request,tenantA,apiUrl})=>{
  test.setTimeout(90000);
  const factory=new CommercialFactory(request,apiUrl,tenantA);
  const result=await factory.createConfirmedPayment();
  expect(result.payment.status).toBe('confirmed');
  expect(await factory.receiptHash(result.contract.id,result.payment.id)).toMatch(/^[a-f0-9]{64}$/);
});

test('PDF-09/10/11/15 receipt remains immutable after company changes',async({request,tenantA,apiUrl})=>{
  test.setTimeout(90000);
  const factory=new CommercialFactory(request,apiUrl,tenantA);
  const {contract,payment}=await factory.createConfirmedPayment();
  const before=await factory.receiptHash(contract.id,payment.id);
  const update=await request.patch(`${apiUrl}/api/v1/company/receipt-settings`,{headers:tenantA.headers,data:{commercial_name:'Changed AFTER issue'}});
  expect(update.status(),await update.text()).toBe(200);
  const after=await factory.receiptHash(contract.id,payment.id);
  expect(after).toBe(before);
});
