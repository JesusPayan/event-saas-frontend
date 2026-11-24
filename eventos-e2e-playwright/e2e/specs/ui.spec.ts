import { test, expect } from '../fixtures/tenant';

test('@smoke AUTH-05 anonymous user cannot open dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('UI login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test('UI company settings is protected from anonymous users', async ({ page }) => {
  await page.goto('/company/receipt-settings');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});
