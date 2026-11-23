import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const routes = read('src/app/app.routes.ts');

test('every lazy route points to an existing component that exports the referenced class', () => {
  const pattern = /import\(\s*'(\.\/[^']+)'\s*\)\s*\.then\(\s*m\s*=>\s*m\.(\w+)\s*\)/g;
  const found = [...routes.matchAll(pattern)];
  assert.ok(found.length > 20, 'expected lazy routes');
  for (const [, path, className] of found) {
    const file = resolve(root, 'src/app', path + '.ts');
    assert.ok(existsSync(file), `missing file for route: ${path}`);
    assert.match(readFileSync(file, 'utf8'), new RegExp(`export class ${className}\\b`),
      `${path} does not export ${className}`);
  }
});

test('billing routes live inside the authenticated tenant layout', () => {
  const layoutEnd = routes.indexOf('// Fin de children de AdminLayoutComponent');
  for (const path of ['billing/plans', 'billing/subscription', 'billing/return', 'platform/prices', 'platform/subscriptions']) {
    const index = routes.indexOf(`path: '${path}'`);
    assert.ok(index > 0 && index < layoutEnd, `${path} must be a child of the admin layout`);
  }
  assert.equal(routes.match(/path: 'sign\/:token'/g)?.length, 1, 'public signing route must be declared once');
});

test('global operator panel is protected by operatorGuard, not a tenant permission', () => {
  for (const path of ['platform/prices', 'platform/subscriptions']) {
    const block = routes.slice(routes.indexOf(`path: '${path}'`), routes.indexOf(`path: '${path}'`) + 400);
    assert.match(block, /canActivate:\s*\[\s*operatorGuard\s*\]/);
  }
});

test('checkout never sends an amount from the browser', () => {
  const service = read('src/app/pages/billing/billing.service.ts');
  const checkout = service.slice(service.indexOf('checkout(plan_price_id'), service.indexOf('latestCheckout'));
  assert.match(checkout, /\{\s*plan_price_id,\s*payer_email\s*\}/);
  assert.doesNotMatch(checkout, /amount/);
});

test('return page does not trust URL query params as payment evidence', () => {
  const page = read('src/app/pages/billing/billing-return/billing-return.component.ts');
  assert.doesNotMatch(page, /ActivatedRoute|queryParam|collection_status|preapproval_id/);
  assert.match(page, /api\.current\(\)/);
});

test('production build does not inline critical CSS (needs an inline onload, blocked by CSP)', () => {
  const angular = JSON.parse(read('angular.json'));
  const prod = angular.projects['eventos-saas-web'].architect.build.configurations.production;
  assert.equal(prod.optimization?.styles?.inlineCritical, false);
  const csp = read('deploy/security-headers.conf');
  assert.match(csp, /script-src 'self';/);
});
