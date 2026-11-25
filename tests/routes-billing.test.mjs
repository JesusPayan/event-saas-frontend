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
  for (const path of ['billing/plans', 'billing/subscription', 'billing/return']) {
    const index = routes.indexOf(`path: '${path}'`);
    assert.ok(index > 0 && index < layoutEnd, `${path} must be a child of the admin layout`);
  }
  assert.equal(routes.match(/path: 'sign\/:token'/g)?.length, 1, 'public signing route must be declared once');
});

test('platform panel requires authentication and a platform permission on every page, not a tenant permission', () => {
  // ROLES-01: el panel de plataforma no exige elegir empresa (promotores y administradores
  // pueden no tener una), pero cada página exige su permiso de plataforma.
  const start = routes.indexOf("path: 'platform',");
  const end = routes.indexOf("path: 'promoter',");
  assert.ok(start > 0 && end > start, 'platform parent route must exist');
  const block = routes.slice(start, end);
  assert.match(block, /canActivate:\s*\[authGuard\]/);
  const expected = {
    organizations: 'platform.orgs.manage', roles: 'platform.roles.manage', categories: 'platform.catalog.manage',
    audit: 'platform.audit.read', prices: 'platform.plans.manage', subscriptions: 'platform.billing.operate',
  };
  for (const [path, permission] of Object.entries(expected)) {
    const child = block.slice(block.indexOf(`path: '${path}'`), block.indexOf(`path: '${path}'`) + 400);
    assert.match(child, new RegExp(`canActivate:\\s*\\[platformGuard\\('${permission.replace(/\./g, '\\.')}`), path);
    assert.doesNotMatch(child, /permissionGuard/, `${path} must not use a tenant permission`);
  }
  assert.match(routes.slice(end, end + 300), /platformGuard\('promoter\.referrals'\)/);
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

test('global styles stay in Tailwind layers so utilities are never overridden', () => {
  const css = read('src/styles.css');
  // Fuera de @layer solo deben quedar los imports/plugins de Tailwind.
  const outside = css.replace(/@layer\s+\w+\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(outside, /[a-z.#*][^;{}]*\{/i, 'unlayered CSS rule found in styles.css');
});

test('standardized screens no longer use legacy layout classes', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const files = [];
  const walk = dir => { for (const f of readdirSync(dir)) { const p = resolve(dir, f); statSync(p).isDirectory() ? walk(p) : /\.(html|ts)$/.test(f) && files.push(p); } };
  walk(resolve(root, 'src/app'));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /class="(panel|auth-card|tiles|module-card|eyebrow|form-page|tenant)"/, `legacy class in ${file}`);
  }
});

test('session survives reloads via sessionStorage only (never localStorage)', () => {
  const auth = read('src/app/services/auth.service.ts');
  assert.match(auth, /sessionStorage\.setItem/);
  assert.doesNotMatch(auth, /localStorage/);
  assert.match(read('src/main.ts'), /provideAppInitializer\(\s*\(\)\s*=>\s*inject\(AuthService\)\.restore\(\)\s*\)/);
});

test('reset and invite tokens are read from the URL fragment, never the query string', () => {
  for (const path of ['src/app/pages/password-reset/password-reset.component.ts', 'src/app/pages/invite-accept/invite-accept.component.ts']) {
    const text = read(path);
    assert.match(text, /snapshot\.fragment/);
    assert.doesNotMatch(text, /queryParam/);
  }
});

test('401 on public credential endpoints does not end the session', () => {
  const interceptor = read('src/app/services/auth.interceptor.ts');
  for (const p of ['/api/v1/auth/login', '/api/v1/auth/password/', '/api/v1/invitations/accept']) {
    assert.ok(interceptor.includes(`'${p}'`), p);
  }
});

test('EasiAcc brand: no legacy name in the app, correct spelling and assets present', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const files = [];
  const walk = dir => { for (const f of readdirSync(dir)) { const p = resolve(dir, f); statSync(p).isDirectory() ? walk(p) : /\.(html|ts|css)$/.test(f) && files.push(p); } };
  walk(resolve(root, 'src'));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /Eventos SaaS/, `marca anterior en ${file}`);
    if (!file.endsWith('core/brand.ts')) assert.doesNotMatch(text, /EasyAcc/i, `«EasyAcc» mal escrito en ${file}`);
  }
  const index = read('src/index.html');
  assert.match(index, /<title>EasiAcc Events/);
  assert.match(index, /rel="manifest" href="site.webmanifest"/);
  for (const asset of ['public/favicon.svg', 'public/favicon.ico', 'public/icons/icon-192.png', 'public/icons/icon-512.png',
                       'public/brand/easiacc-horizontal.svg', 'public/brand/easiacc-isotipo.svg']) {
    assert.ok(existsSync(resolve(root, asset)), `falta ${asset}`);
  }
  assert.equal(JSON.parse(read('public/site.webmanifest')).name, 'EasiAcc Events');
});

test('dashboard sends timezone-aware dates to the events calendar (backend rejects naive ISO)', () => {
  const dashboard = read('src/app/pages/dashboard-component/dashboard.component.ts');
  assert.match(dashboard, /events\.calendar\(/);
  assert.doesNotMatch(dashboard, /toISOString\(\)\.slice\(/);
});

test('app formats dates, numbers and currency in Spanish (Mexico)', () => {
  const main = read('src/main.ts');
  assert.match(main, /registerLocaleData\(localeEsMx\)/);
  assert.match(main, /provide: LOCALE_ID, useValue: 'es-MX'/);
  assert.match(main, /provide: DEFAULT_CURRENCY_CODE, useValue: 'MXN'/);
});
