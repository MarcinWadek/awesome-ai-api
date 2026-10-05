import { expect, test as base } from '@playwright/test';
import { AuthClient } from '../clients/auth.client';
import { generateRegistrationData } from '../generators/registration.generator';
import type { LoginResponse } from '../types/auth';
import type { RegistrationRequest } from '../types/registration';

export interface AuthenticatedUser {
  user: RegistrationRequest;
  token: string;
}

export const test = base.extend<{ authenticatedUser: AuthenticatedUser }>({
  authenticatedUser: async ({ request }, use) => {
    const authClient = new AuthClient(request);
    const user = generateRegistrationData();

    await base.step('Register a unique test user', async () => {
      const response = await authClient.signUp(user);
      expect(response.status()).toBe(201);
    });

    const token = await base.step('Sign in as the registered user', async () => {
      const response = await authClient.signIn({
        username: user.username,
        password: user.password,
      });
      expect(response.status()).toBe(200);

      const body = (await response.json()) as LoginResponse;
      if (typeof body.token !== 'string' || !body.token.trim()) {
        throw new Error('Sign-in must return a nonempty access token');
      }
      return body.token;
    });

    await use({ user, token });
  },
});

// Fixture setup sends passwords and receives tokens; keep them out of traces.
test.use({ trace: 'off' });

export { expect };
