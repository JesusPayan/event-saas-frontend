
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) =>
  readFileSync(new URL(path, import.meta.url), 'utf8');

test('router protects tenant routes', () => {
  const routes = read('../src/app/app.routes.ts');

  assert.match(routes, /permissionGuard\s*\(\s*'members.read'\s*\)/);
  assert.match(routes, /tenantGuard/);
});

test('interceptor scopes token to local API', () => {
  const interceptor = read(
    '../src/app/services/auth.interceptor.ts'
  );

  // Verificar restricción a la API.
  assert.match(
    interceptor,
    /req\.url\.startsWith\s*\(\s*['"]\/api\/v1\/['"]\s*\)/
  );

  // Verificar encabezado JWT.
  assert.match(interceptor, /Authorization/);

  // Verificar aislamiento multiempresa.
  assert.match(interceptor, /X-Tenant-ID/);

  // Verificar clonación de la solicitud.
  assert.match(interceptor, /req\.clone/);
});
