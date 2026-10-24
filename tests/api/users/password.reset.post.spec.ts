import { randomUUID } from 'node:crypto';
import { AuthClient } from '../../../clients/auth.client';
import { UsersClient } from '../../../clients/users.client';
import { test, expect } from '../../../fixtures/auth.fixture';
import { generateRegistrationData } from '../../../generators/registration.generator';
import { expectJsonResponse, expectNoStoreResponse } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { ApiErrorResponse, LoginResponse } from '../../../types/auth';
import type { UserResponse } from '../../../types/users';

test.describe('POST /api/v1/users/password/reset', () => {
  test.describe.configure({ retries: 0 });
  let authClient: AuthClient;
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    authClient = new AuthClient(request);
    usersClient = new UsersClient(request);
  });

  test('400: rejects an unknown reset token and leaves the original password usable', async ({ authenticatedUser }) => {
    const { user } = authenticatedUser;
    const payload = await test.step('Given an unknown nonblank token and otherwise valid matching passwords', async () => {
      const newPassword = generateRegistrationData().password;
      expect(newPassword !== user.password, 'Proposed password differs from the original').toBe(true);
      return { token: `invalid-${randomUUID()}`, newPassword, confirmPassword: newPassword };
    });
    const response = await test.step('When the public reset operation receives the unknown token', () => authClient.resetPassword(payload));

    await test.step('Then the token is rejected without applying the proposed password', async () => {
      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      const error = await response.json() as ApiErrorResponse;
      expect(error.message === 'Invalid password reset token', 'Unknown token error').toBe(true);

      const rejected = await authClient.signIn({ username: user.username, password: payload.newPassword });
      expect(rejected.status()).toBe(422);
      expectJsonResponse(rejected);
    });

    await test.step('Then the original password still creates a usable session for the same user', async () => {
      const login = await authClient.signIn({ username: user.username, password: user.password });
      expect(login.status()).toBe(200);
      expectJsonResponse(login);
      expectNoStoreResponse(login);
      const session = await login.json() as LoginResponse;
      expect(session.mfaRequired).toBe(false);
      expect(typeof session.token === 'string' && session.token.length > 0, 'Access token supplied without exposing it').toBe(true);
      const profile = await usersClient.getMe(session.token!);
      expect(profile.status()).toBe(200);
      expectJsonResponse(profile);
      expectRegisteredUserProfile(await profile.json() as UserResponse, user);
    });
  });
});
