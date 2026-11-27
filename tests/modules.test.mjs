// MOD-01: navegación, rutas y dashboard dependen de los módulos activos de la empresa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const routes = read('src/app/app.routes.ts');
const sidebar = read('src/app/layout/sidebar/sidebar/sidebar.html');

const routeBlock = (path) => {
  const index = routes.indexOf(`path: '${path}'`);
  assert.ok(index > 0, `route ${path} must exist`);
  return routes.slice(index, index + 450);
};

test('module routes are protected by moduleGuard with the right module', () => {
  const expected = {
    'inventory': 'INVENTORY', 'inventory/new': 'INVENTORY', 'inventory/operations': 'INVENTORY',
    'inventory/reports': 'REPORTS', 'logistics': 'LOGISTICS', 'logistics/new': 'LOGISTICS',
    'contracts': 'COMMERCIAL_CONTRACTS', ':id/payments': 'COMMERCIAL_PAYMENTS', 'catalog': 'COMMERCIAL_CATALOG',
    'providers': 'SUPPLIERS', 'provider/items': 'SUPPLIERS', 'network/requests': 'ORGANIZATION_NETWORK',
    'company/receipt-settings': 'COMMERCIAL_CONTRACTS',
  };
  for (const [path, module] of Object.entries(expected)) {
    assert.match(routeBlock(path), new RegExp(`moduleGuard\\('${module}'\\)`), path);
  }
});

test('onboarding is per company, only for managers, and gates the dashboard', () => {
  assert.match(routeBlock('onboarding'), /canActivate:\s*\[authGuard, tenantGuard, permissionGuard\('members\.manage'\)\]/);
  assert.match(routeBlock('dashboard'), /onboardingGuard/);
  assert.match(routeBlock('settings/modules'), /permissionGuard\('tenant\.read'\)/);
});

test('platform module administration requires platform permissions', () => {
  assert.match(routeBlock('business-types'), /platformGuard\('platform\.catalog\.manage'\)/);
  assert.match(routeBlock('modules'), /platformGuard\('platform\.catalog\.manage'\)/);
});

test('sidebar hides optional modules that are not active', () => {
  for (const [link, module] of [['/catalog', 'COMMERCIAL_CATALOG'], ['/providers', 'SUPPLIERS'],
    ['/network/requests', 'ORGANIZATION_NETWORK'], ['/contracts', 'COMMERCIAL_CONTRACTS'],
    ['/inventory/reports', 'REPORTS']]) {
    const index = sidebar.indexOf(`routerLink="${link}"`);
    assert.ok(index > 0, link);
    const before = sidebar.slice(Math.max(0, index - 400), index);
    assert.match(before, new RegExp(`hasModule\\('${module}'\\)`), `${link} must check ${module}`);
  }
  assert.match(sidebar, /hasModule\('INVENTORY'\)/);
  assert.match(sidebar, /hasModule\('LOGISTICS'\)/);
});

test('dashboard widgets declare module and permission', () => {
  const dashboard = read('src/app/pages/dashboard-component/dashboard.component.ts');
  const widgets = [...dashboard.matchAll(/\{ id: '(\w+)', module: '(\w+)', permission: '([\w.]+)' \}/g)];
  assert.ok(widgets.length >= 8);
  const html = read('src/app/pages/dashboard-component/dashboard.component.html');
  for (const id of ['quotes_sent', 'network_requests', 'inventory', 'logistics', 'contracts']) {
    assert.match(html, new RegExp(`show\\('${id}'\\)`), id);
  }
});

test('the client never decides access: module guard allows read-only history, server enforces', () => {
  const guard = read('src/app/services/auth.guard.ts');
  assert.match(guard, /export const moduleGuard/);
  assert.match(guard, /status === 'unavailable'/);
});
