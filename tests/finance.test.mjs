// FIN-01 / TEN-ADM: finanzas de empresa y plataforma, administración de empresas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const routes = read('src/app/app.routes.ts');
const sidebar = read('src/app/layout/sidebar/sidebar/sidebar.html');
const service = read('src/app/services/finance.service.ts');
const page = read('src/app/pages/finance/finance-page.component.ts');
const pageHtml = read('src/app/pages/finance/finance-page.component.html');
const orgs = read('src/app/pages/platform/platform-organizations/platform-organizations.component.ts');
const orgsHtml = read('src/app/pages/platform/platform-organizations/platform-organizations.component.html');

const blocks = (path) => {
  const out = [];
  let i = routes.indexOf(`path: '${path}'`);
  while (i >= 0) { out.push(routes.slice(i, i + 320)); i = routes.indexOf(`path: '${path}'`, i + 1); }
  return out;
};

test('company and platform finances use separate permissions', () => {
  const finance = blocks('finance');
  assert.equal(finance.length, 2);
  assert.ok(finance.some(b => /permissionGuard\('finance\.read'\)/.test(b) && /scope: 'tenant'/.test(b)));
  assert.ok(finance.some(b => /platformGuard\('platform\.finance\.read'\)/.test(b) && /scope: 'platform'/.test(b)));
  assert.match(sidebar, /hasPermission\('finance\.read'\)[\s\S]{0,120}routerLink="\/finance"/);
  assert.match(sidebar, /hasPlatformPermission\('platform\.finance\.read'\)[\s\S]{0,120}routerLink="\/platform\/finance"/);
});

test('finance client never sends a tenant id for company scope and exports with the same filters', () => {
  assert.match(service, /'\/api\/v1\/finance'/);
  assert.match(service, /'\/api\/v1\/platform\/finance'/);
  // El alcance de la empresa lo resuelve el servidor (X-Tenant-ID del interceptor), nunca un parámetro.
  assert.match(page, /scope === 'tenant' \? \{ event_id/);
  assert.match(service, /movements\.csv/);
  assert.match(page, /exportCsv\(this\.scope, this\.query\(1\)\)/);
  assert.match(service, /Idempotency-Key/);
});

test('finance view labels net flow and shows totals per currency', () => {
  assert.match(pageHtml, /Flujo neto registrado/);
  assert.match(pageHtml, /No es utilidad contable/);
  assert.match(pageHtml, /@for \(cur of currencies\(\)/);
  assert.match(page, /finance\.manage/);
  assert.match(page, /platform\.finance\.manage/);
  assert.match(pageHtml, /Motivo de la corrección/);
});

test('organization lifecycle requires reasons, confirmation and specific permissions', () => {
  for (const status of ["suspended", "active", "archived"]) assert.match(orgs, new RegExp(`'${status}'`));
  assert.match(orgs, /platform\.orgs\.archive/);
  assert.match(orgs, /platform\.orgs\.restore/);
  assert.match(orgs, /needsReason\(action: StatusAction\): boolean \{ return action !== 'activate'; \}/);
  assert.match(orgs, /confirmSlug\.trim\(\) === this\.detail\(\)\?\.slug/);
  assert.match(orgs, /subscription_renewal_active/);
  assert.match(orgsHtml, /value="archived"/);
  assert.match(orgsHtml, /estado de cobro, independiente/);
});
