import { expect, test } from '@playwright/test';
import type { AuthClient } from '../clients/auth.client';
import type { UsersClient } from '../clients/users.client';
import { generateRegistrationData } from '../generators/registration.generator';
import type { LoginResponse } from '../types/auth';
import type { RegistrationRequest } from '../types/registration';
import { expectJsonResponse } from './assertions/http';

export interface AuthenticatedUser {
  user: RegistrationRequest;
  token: string;
  refreshToken: string;
}

interface AccountClients {
  authClient: Pick<AuthClient, 'signUp' | 'signIn'>;
  usersClient: Pick<UsersClient, 'getUser' | 'forgetUser'>;
}

interface AccountOptions {
  observerToken?: string;
  renewToken?: (user: RegistrationRequest) => Promise<string>;
  // Commerce must restore inventory before account deletion removes its orders.
  beforeDelete?: (account: AuthenticatedUser) => Promise<void>;
}

// Never include credential values in assertion failures.
export function requireSessionToken(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Sign-in must return a nonempty session credential');
  }
  return value;
}

export async function useRegisteredUser(
  { authClient, usersClient }: AccountClients,
  use: (account: AuthenticatedUser) => Promise<void>,
  { observerToken, renewToken, beforeDelete }: AccountOptions = {},
): Promise<void> {
  const user = generateRegistrationData();
  let registered = false;
  let token: string | undefined;
  let account: AuthenticatedUser | undefined;
  let primaryError: unknown;

  async function login() {
    return authClient.signIn({ username: user.username, password: user.password });
  }

  async function freshToken(): Promise<string> {
    if (renewToken) return requireSessionToken(await renewToken(user));
    const response = await login();
    expect(response.status()).toBe(200);
    return requireSessionToken((await response.json() as LoginResponse).token);
  }

  try {
    await test.step('Given a unique registered test account', async () => {
      const response = await authClient.signUp(user);
      registered = response.status() === 201;
      expect(response.status()).toBe(201);
    });
    await test.step('Given the test account has a client session', async () => {
      const response = await login();
      expect(response.status()).toBe(200);
      expectJsonResponse(response);
      const body = await response.json() as LoginResponse;
      // Save the cleanup token before validating the rest of the response.
      token = requireSessionToken(body.token);
      const refreshToken = requireSessionToken(body.refreshToken);
      expect(body.roles).toEqual(['ROLE_CLIENT']);
      account = { user, token, refreshToken };
    });
    await use(account!);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      await test.step('Then delete the owned test account', async () => {
        // An observer permits already-deleted lifecycle accounts and verifies absence.
        if (observerToken !== undefined) {
          const before = await usersClient.getUser(user.username, observerToken);
          if (before.status() === 404) return;
          expect(before.status()).toBe(200);
          registered = true;
        }

        token = account?.token ?? token;
        if (token === undefined && !registered) {
          // Signup may have committed before a lost or unexpected response.
          const response = await login();
          if (response.status() === 401) return;
          expect(response.status()).toBe(200);
          token = requireSessionToken((await response.json() as LoginResponse).token);
        }
        token ??= await freshToken();
        if (account && beforeDelete) {
          account.token = token;
          await beforeDelete(account);
        }
        let response = await usersClient.forgetUser(user.username, token);
        if (response.status() === 401) {
          token = await freshToken();
          response = await usersClient.forgetUser(user.username, token);
        }
        expect(response.status()).toBe(204);
        if (observerToken !== undefined) {
          expect((await usersClient.getUser(user.username, observerToken)).status()).toBe(404);
        }
      });
    } catch (cleanupError) {
      const message = `Failed to clean up generated user ${user.username}`;
      if (primaryError !== undefined) throw new AggregateError([primaryError, cleanupError], message);
      throw new Error(message, { cause: cleanupError });
    }
  }
}
