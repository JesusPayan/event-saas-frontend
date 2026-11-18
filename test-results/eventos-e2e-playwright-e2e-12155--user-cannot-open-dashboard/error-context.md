# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: eventos-e2e-playwright\e2e\specs\ui.spec.ts >> @smoke AUTH-05 anonymous user cannot open dashboard
- Location: eventos-e2e-playwright\e2e\specs\ui.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/dashboard", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '../fixtures/tenant';
  2  | 
  3  | test('@smoke AUTH-05 anonymous user cannot open dashboard', async ({ page }) => {
> 4  |   await page.goto('/dashboard');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   await expect(page).toHaveURL(/\/login(?:\?|$)/);
  6  | });
  7  | 
  8  | test('UI login page loads', async ({ page }) => {
  9  |   await page.goto('/login');
  10 |   await expect(page.locator('input[type="password"]')).toBeVisible();
  11 | });
  12 | 
  13 | test('UI company settings is protected from anonymous users', async ({ page }) => {
  14 |   await page.goto('/company/receipt-settings');
  15 |   await expect(page).toHaveURL(/\/login(?:\?|$)/);
  16 | });
  17 | 
```