
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainTs = readFileSync(
  new URL('../src/main.ts', import.meta.url),
  'utf8'
);

test('Angular bootstrap has HttpClient provider', () => {
  assert.match(
    mainTs,
    /provideHttpClient\s*\(\s*withInterceptors\s*\(\s*\[\s*authInterceptor\s*\]\s*\)\s*\)/
  );
});
