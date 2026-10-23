import type { APIRequestContext } from '@playwright/test';
import { AuthClient } from '../clients/auth.client';
import { UsersClient } from '../clients/users.client';
import { generateRegistrationData } from '../generators/registration.generator';
import type { LoginResponse } from '../types/auth';
import type { RegistrationRequest } from '../types/registration';
import { expect, test as authTest } from './auth.fixture';

export interface LifecycleUser {
  user: RegistrationRequest;
  token: string;
  refreshToken: string;
}

async function signIn(
  authClient: AuthClient,
  user: RegistrationRequest,
): Promise<LoginResponse> {
  const response = await authClient.signIn({ username: user.username, password: user.password });
  if (response.status() !== 200) {
    throw new Error(`Lifecycle account sign-in returned ${response.status()}`);
  }
  return await response.json() as LoginResponse;
}

function requireToken(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Lifecycle sign-in must return a nonempty ${name}`);
  }
  return value;
}

async function useLifecycleUser(
  request: APIRequestContext,
  observerToken: string,
  use: (user: LifecycleUser) => Promise<void>,
): Promise<void> {
  const authClient = new AuthClient(request);
  const usersClient = new UsersClient(request);
  const user = generateRegistrationData();
  let registered = false;
  let token: string | undefined;
  let primaryError: unknown;

  try {
    await authTest.step('Given a newly registered lifecycle account', async () => {
      const response = await authClient.signUp(user);
      registered = response.status() === 201;
      expect(response.status()).toBe(201);
    });

    const login = await authTest.step('Sign in to obtain lifecycle credentials', () => signIn(authClient, user));
    token = requireToken(login.token, 'access token');
    const refreshToken = requireToken(login.refreshToken, 'refresh token');
    await use({ user, token, refreshToken });
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (registered) {
      try {
        await authTest.step('Clean up the lifecycle account and verify its absence independently', async () => {
          const beforeCleanup = await usersClient.getUser(user.username, observerToken);
          if (beforeCleanup.status() === 404) return;
          expect(beforeCleanup.status()).toBe(200);

          let cleanupToken = token;
          if (cleanupToken === undefined) {
            const loginResponse = await authClient.signIn({ username: user.username, password: user.password });
            expect(loginResponse.status()).toBe(200);
            cleanupToken = requireToken((await loginResponse.json() as LoginResponse).token, 'cleanup access token');
          }

          let response = await usersClient.forgetUser(user.username, cleanupToken);
          if (response.status() === 401) {
            const loginResponse = await authClient.signIn({ username: user.username, password: user.password });
            expect(loginResponse.status()).toBe(200);
            cleanupToken = requireToken((await loginResponse.json() as LoginResponse).token, 'cleanup access token');
            response = await usersClient.forgetUser(user.username, cleanupToken);
          }

          const afterCleanup = await usersClient.getUser(user.username, observerToken);
          expect(response.status()).toBe(204);
          expect(afterCleanup.status(), `Cleanup delete returned ${response.status()}`).toBe(404);
        });
      } catch (cleanupError) {
        const message = 'Failed to clean up a generated lifecycle account';
        if (primaryError !== undefined) {
          throw new AggregateError([primaryError, cleanupError], message);
        }
        throw new Error(message, { cause: cleanupError });
      }
    }
  }
}

export const test = authTest.extend<{
  lifecycleUser: LifecycleUser;
}>({
  lifecycleUser: async ({ request, authenticatedUser }, use) =>
    useLifecycleUser(request, authenticatedUser.token, use),
});

export { expect };
