import { AuthClient } from '../clients/auth.client';
import { test as userTest, expect } from './auth.fixture';
import { adminApiConfig } from '../support/config';
import type { LoginResponse } from '../types/auth';

export const test = userTest.extend<{ authenticatedAdmin: { token: string } }>({
  trace: 'off',
  authenticatedAdmin: async ({ request, baseURL }, use) => {
    // Prevent accidental use of shared admin credentials against the other host.
    if (!baseURL || new URL(baseURL).origin !== 'https://aitesters.byst.re') {
      throw new Error('Admin authentication requires the aitesters staging environment');
    }
    const token = await test.step('Given a signed-in staging admin', async () => {
      const authClient = new AuthClient(request);
      const response = await authClient.signIn(adminApiConfig.validLoginCredentials);
      expect(response.status()).toBe(200);
      const body = await response.json() as LoginResponse;
      // Boolean checks keep token values out of assertion errors.
      expect(Array.isArray(body.roles) && body.roles.includes('ROLE_ADMIN')).toBe(true);
      expect(typeof body.token === 'string' && body.token.trim().length > 0).toBe(true);
      return body.token as string;
    });
    await use({ token });
    // Context disposal is owned by Playwright. Never log out the shared account.
  },
});

export { expect };
