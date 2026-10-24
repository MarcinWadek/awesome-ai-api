import { defineConfig } from '@playwright/test';

// Offline fault-injection checks; kept separate from endpoint coverage.
export default defineConfig({
  testDir: './tests/fixtures',
  outputDir: './exploration-results/fixture-test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 4,
  reporter: 'list',
  use: { trace: 'off' },
});
