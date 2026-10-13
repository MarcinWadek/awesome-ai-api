import { defineConfig } from '@playwright/test';
import { adminApiConfig, apiConfig } from './support/config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['./support/redact-errors.reporter.ts'],
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.ts',
      use: { baseURL: apiConfig.baseUrl },
    },
    {
      name: 'admin',
      testMatch: '**/admin/**/*.spec.ts',
      use: { baseURL: adminApiConfig.baseUrl, trace: 'off' },
    },
  ],
});
