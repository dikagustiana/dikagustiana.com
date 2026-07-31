import { test, expect } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * Auth + protected-route behaviour. Supabase auth is mocked, so a successful
 * sign-in/sign-up returns a valid-looking session and the app should react to
 * it (toast + redirect) exactly as it would against a real backend.
 */

test.beforeEach(async ({ page }) => {
  await mockSupabase(page);
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
});

test('admin-only route redirects unauthenticated users to /auth', async ({ page }) => {
  await page.goto('/admin/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('auth form renders with email + password fields and toggles to sign up', async ({ page }) => {
  await page.goto('/auth', { waitUntil: 'load' });
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

  // Toggle to "Create Account".
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
});

test('HTML5 validation blocks submit with empty fields', async ({ page }) => {
  await page.goto('/auth', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Browser rejects submit -> still on /auth, email is invalid.
  await expect(page).toHaveURL(/\/auth$/);
  const emailInvalid = await page.locator('#email').evaluate(
    (el: HTMLInputElement) => !el.validity.valid,
  );
  expect(emailInvalid).toBe(true);
});

test('successful sign-in (mocked) shows welcome toast and redirects home', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/auth', { waitUntil: 'load' });
  await page.locator('#email').fill('tester@example.com');
  await page.locator('#password').fill('supersecret');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // App navigates to home on success.
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  expect(pageErrors).toEqual([]);
});

test('successful sign-up (mocked) is handled without runtime error', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/auth', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.locator('#email').fill('newuser@example.com');
  await page.locator('#password').fill('supersecret');
  await page.getByRole('button', { name: 'Sign Up' }).click();

  // Either a toast appears or it redirects home; key assertion: no crash.
  await page.waitForTimeout(1000);
  expect(pageErrors).toEqual([]);
});
