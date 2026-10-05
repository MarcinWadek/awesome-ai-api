import { expect, test as base, type APIRequestContext } from '@playwright/test';
import { AuthClient } from '../clients/auth.client';
import { UsersClient } from '../clients/users.client';
import { generateRegistrationData } from '../generators/registration.generator';
import type { LoginResponse } from '../types/auth';
import type { RegistrationRequest } from '../types/registration';

export interface AuthenticatedUser {
  user: RegistrationRequest;
  token: string;
  refreshToken: string;
}

async function useRegisteredUser(
  request: APIRequestContext,
  use: (user: AuthenticatedUser) => Promise<void>,
): Promise<void> {
  const authClient = new AuthClient(request);
  const usersClient = new UsersClient(request);
  const user = generateRegistrationData();
  await base.step('Register a unique test user', async () => {
    const response = await authClient.signUp(user);
    expect(response.status()).toBe(201);
  });

  const { token, refreshToken } = await base.step('Sign in as the registered user', async () => {
    const response = await authClient.signIn({
      username: user.username,
      password: user.password,
    });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as LoginResponse;
    if (typeof body.token !== 'string' || !body.token.trim()) {
      throw new Error('Sign-in must return a nonempty access token');
    }
    if (typeof body.refreshToken !== 'string' || !body.refreshToken.trim()) {
      throw new Error('Sign-in must return a nonempty refresh token');
    }
    return { token: body.token, refreshToken: body.refreshToken };
  });

  try {
    await use({ user, token, refreshToken });
  } finally {
    await base.step('Delete the generated test user', async () => {
      const response = await usersClient.forgetUser(user.username, token);
      expect(response.status()).toBe(204);
    });
  }
}

export const test = base.extend<{
  authenticatedUser: AuthenticatedUser;
  authenticatedPeer: AuthenticatedUser;
}>({
  // Fixture setup sends passwords and receives tokens; keep them out of traces.
  trace: 'off',
  authenticatedUser: async ({ request }, use) => {
    await useRegisteredUser(request, use);
  },
  authenticatedPeer: async ({ request }, use) => {
    await useRegisteredUser(request, use);
  },
});

export { expect };
