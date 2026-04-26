import { test, expect } from '@playwright/test';

// All tests run against mobile viewports defined in playwright.config.js (iPhone 14, Pixel 5).
// The dev server must be running at http://localhost:5173 before running these tests.
// The /test/:id route requires auth — these tests cover layout/structure, not API responses.
// Use `npx playwright test --project="iPhone 14"` to target a specific device.

const SESSION_PATH = '/test/test-session-id';

test.describe('mobile tab bar', () => {
  test('tablist is visible on mobile', async ({ page }) => {
    await page.goto(SESSION_PATH);
    const tablist = page.getByRole('tablist');
    await expect(tablist).toBeVisible();
    await expect(page.getByRole('tab', { name: /chat/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /blueprint/i })).toBeVisible();
  });

  test('chat panel is shown by default; blueprint panel is hidden', async ({ page }) => {
    await page.goto(SESSION_PATH);
    await expect(page.locator('[data-panel="chat"]')).toBeVisible();
    await expect(page.locator('[data-panel="blueprint"]')).toBeHidden();
  });

  test('tapping Blueprint tab shows blueprint and hides chat', async ({ page }) => {
    await page.goto(SESSION_PATH);
    await page.getByRole('tab', { name: /blueprint/i }).click();
    await expect(page.locator('[data-panel="blueprint"]')).toBeVisible();
    await expect(page.locator('[data-panel="chat"]')).toBeHidden();
  });
});

test.describe('chat input visibility', () => {
  test('message input is within viewport without scrolling', async ({ page }) => {
    await page.goto(SESSION_PATH);
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    const { height: viewportHeight } = page.viewportSize();
    const box = await textarea.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight);
  });
});

test.describe('blueprint download button', () => {
  test('PDF download button is visible on blueprint tab without scrolling', async ({ page }) => {
    await page.goto(SESSION_PATH);
    await page.getByRole('tab', { name: /blueprint/i }).click();
    const btn = page.getByRole('button', { name: /download blueprint/i });
    await expect(btn).toBeVisible();
    const { height: viewportHeight } = page.viewportSize();
    const box = await btn.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight);
  });
});

test.describe('desktop layout unchanged', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('no tablist visible at desktop width', async ({ page }) => {
    await page.goto(SESSION_PATH);
    // tablist has md:hidden so it should not be visible at 1280px
    const tablist = page.getByRole('tablist');
    await expect(tablist).toBeHidden();
  });

  test('both panels are visible side-by-side at desktop width', async ({ page }) => {
    await page.goto(SESSION_PATH);
    await expect(page.locator('[data-panel="chat"]')).toBeVisible();
    await expect(page.locator('[data-panel="blueprint"]')).toBeVisible();
  });
});
