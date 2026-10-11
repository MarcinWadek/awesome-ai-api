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
  let registered = false;
  let token: string | undefined;
  let primaryError: unknown;

  async function signIn(): Promise<LoginResponse> {
    const response = await authClient.signIn({
      username: user.username,
      password: user.password,
    });
    expect(response.status()).toBe(200);

    return await response.json() as LoginResponse;
  }

  function accessToken(body: LoginResponse): string {
    if (typeof body.token !== 'string' || !body.token.trim()) {
      throw new Error('Sign-in must return a nonempty access token');
    }
    return body.token;
  }

  try {
    await base.step('Register a unique test user', async () => {
      const response = await authClient.signUp(user);
      registered = response.status() === 201;
      expect(response.status()).toBe(201);
    });
    const { refreshToken } = await base.step('Sign in as the registered user', async () => {
      const body = await signIn();
      // Retain a usable cleanup token even if refresh-token validation fails.
      token = accessToken(body);
      if (typeof body.refreshToken !== 'string' || !body.refreshToken.trim()) {
        throw new Error('Sign-in must return a nonempty refresh token');
      }
      return { refreshToken: body.refreshToken };
    });
    if (token === undefined) throw new Error('Fixture setup did not obtain an access token');
    await use({ user, token, refreshToken });
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (registered) {
      try {
        await base.step('Delete the generated test user', async () => {
          if (token === undefined) token = accessToken(await signIn());
          let response = await usersClient.forgetUser(user.username, token);
          if (response.status() === 401) {
            token = accessToken(await signIn());
            response = await usersClient.forgetUser(user.username, token);
          }
          expect(response.status()).toBe(204);
        });
      } catch (cleanupError) {
        const message = `Failed to clean up generated user ${user.username}`;
        if (primaryError !== undefined) {
          throw new AggregateError([primaryError, cleanupError], message);
        }
        throw new Error(message, { cause: cleanupError });
      }
    }
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
