// SPEC-1 A1 — dayWeather initialization tests (Playwright)
import { test, expect } from '@playwright/test';

// If this URL 404s, change it to 'http://localhost:5173/index.html#records'
const BASE_URL = process.env.APP_URL || 'http://localhost:5173/projectfcr/index.html#records';

test.describe('SPEC-1 A1: dayWeather init', () => {
  test('boots as an object when nothing saved', async ({ page }) => {
    // Clear before any app scripts run
    await page.context().addInitScript(() => {
      try {
        localStorage.removeItem('dayWeather');
      } catch {}
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const isObject = await page.evaluate(
      () => typeof window.dayWeather === 'object' && !Array.isArray(window.dayWeather),
    );
    expect(isObject).toBe(true);
  });

  test('hydrates from localStorage when present', async ({ page }) => {
    const seeded = { '2025-09-13': 'OPTIMAL' };
    // Seed before load so the app can hydrate it
    await page.context().addInitScript((d) => {
      localStorage.setItem('dayWeather', JSON.stringify(d));
    }, seeded);

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const val = await page.evaluate(() => window.dayWeather['2025-09-13']);
    expect(val).toBe('OPTIMAL');
  });
});
