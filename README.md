# E2E-03.3–03.5: reusable commercial factory (test environment only)

Source: user-uploaded events-saas-backend.zip and event-saas-frontend.zip (2026-11-21).

## Files to copy to frontend
- `eventos-e2e-playwright/e2e/fixtures/commercial.ts` (new)
- `eventos-e2e-playwright/e2e/specs/commercial-complete.api.spec.ts` (new)

## Important: legacy skipped spec
The old `eventos-e2e-playwright/e2e/specs/receipts-existing.api.spec.ts` relies on E2E_CONTRACT_ID and E2E_PAYMENT_ID belonging to a newly created tenant, which cannot work. Delete it from the working branch after reviewing the replacement; otherwise the suite still reports one skipped test.

## Run in Windows CMD
Flask must run with FLASK_ENV=test, DB crm_events_test, and Mailpit SMTP and API on 1025 and 8025. Do not point these tests at dev/prod.

```
cd C:\DEV\crm-events\eventos-saas\event-saas-frontend
set E2E_ALLOW_WRITES=yes
set E2E_API_URL=http://127.0.0.1:5000
set E2E_BASE_URL=http://localhost:4200
for /f "delims=" %i in ('powershell -NoProfile -Command "[Convert]::ToBase64String([IO.File]::ReadAllBytes(''eventos-e2e-playwright\e2e\fixtures\e2e-signature.png''))"') do set "E2E_SIGNATURE_PNG_BASE64=%i"
curl http://127.0.0.1:5000/api/v1/e2e/readiness
npm run e2e -- --grep "E2E-03-06|PDF-09"
```

Note: the single `%i` is for interactive CMD, use `%%i` inside `.bat` files. The sample PNG is a **synthetic test signature**, never a real person's signature.

## Safety and expected behavior
- Uses tenantA from guarded tenant fixture and creates its own client/event/quote/contract, invitation/OTP/signatures, payment and receipt.
- Never uses manually provided production IDs or database direct inserts.
- The first run may surface actual API contract mismatches. Test code has been reviewed against the uploaded API files but not executed against the user's running MySQL/Flask/Mailpit.
- Do not merge without passing full Playwright and backend pytest, production Angular build, and CI.
