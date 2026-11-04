import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
test('router protects tenant routes', () => {
 const routes=read('../src/app/app.routes.ts');
 assert.match(routes,/permissionGuard\('members.read'\)/);
 assert.match(routes,/tenantGuard/);
});
test('interceptor scopes token to local API', () => {
 const interceptor=read('../src/app/core/auth.interceptor.ts');
 assert.match(interceptor,/req.url.startsWith\('\/api\/v1\/'\)/);
});
