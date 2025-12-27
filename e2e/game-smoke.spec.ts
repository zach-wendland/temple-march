import { test, expect } from '@playwright/test';

test.describe('Temple March - Smoke Tests', () => {
  test('game boots and main menu loads', async ({ page }) => {
    // Navigate to game
    await page.goto('/');

    // Wait for Phaser to initialize
    await page.waitForTimeout(3000);

    // Check for game canvas
    const gameCanvas = page.locator('canvas').first();
    await expect(gameCanvas).toBeVisible();

    // Check for no critical JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Take screenshot of initial state
    await page.screenshot({ path: 'e2e-results/game-boot.png', fullPage: true });

    // Verify no critical errors (allow some warnings)
    const criticalErrors = errors.filter(e =>
      !e.includes('DevTools') &&
      !e.includes('extension')
    );

    expect(criticalErrors.length).toBeLessThan(3);
  });

  test('game canvas renders without crashes', async ({ page }) => {
    await page.goto('/');

    // Wait for game to load
    await page.waitForTimeout(3000);

    // Check that multiple canvases exist (Phaser + p5.js)
    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThanOrEqual(1);

    // Monitor console for errors during 10 second run
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Let the game run for 10 seconds
    await page.waitForTimeout(10000);

    // Take final screenshot
    await page.screenshot({ path: 'e2e-results/game-running.png', fullPage: true });

    // Check we didn't accumulate many errors
    expect(errors.length).toBeLessThan(5);
  });

  test('check for memory leaks - basic monitoring', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout to 60s for this test

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Get initial memory (if available)
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Let game run for 30 seconds
    await page.waitForTimeout(30000);

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory should not grow more than 200MB in 30 seconds
    const memoryGrowthMB = (finalMemory - initialMemory) / (1024 * 1024);
    console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);

    // This is a soft check - we're just monitoring
    expect(memoryGrowthMB).toBeLessThan(200);
  });

  test('network requests - check asset loading', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });

    await page.goto('/');
    await page.waitForTimeout(5000);

    // Should have no failed asset requests
    expect(failedRequests.length).toBe(0);
  });
});
