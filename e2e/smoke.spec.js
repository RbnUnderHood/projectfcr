import { test, expect } from '@playwright/test';

test('app loads and FCR updates', async ({ page }) => {
await page.goto('index.html');
await expect(page.locator('#navCalculator')).toBeVisible();
await expect(page.locator('#fcrValue')).toBeVisible();

await page.fill('#feedAmount', '50');
await page.fill('#eggCount', '100');

const text = await page.locator('#fcrValue').innerText();
expect(text).not.toEqual('');
});