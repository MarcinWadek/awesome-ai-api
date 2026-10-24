import { randomUUID } from 'node:crypto';
import { test, expect } from '../../../fixtures/auth.fixture';
import { generateRegistrationData } from '../../../generators/registration.generator';
import { json, expectJsonResponse, expectNoStoreResponse } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { ApiErrorResponse, LoginResponse } from '../../../types/auth';
import type { UserResponse } from '../../../types/users';
test.describe('POST /api/v1/users/password/reset', () => {
  test('400: rejects an unknown reset token and leaves the original password usable', async ({ authenticatedUser, authClient, usersClient }) => {
    // Given
    const { user } = authenticatedUser;
    const newPassword = generateRegistrationData().password;
    expect(newPassword !== user.password, 'Proposed password differs from the original').toBe(true);
    const payload = { token: `invalid-${randomUUID()}`, newPassword, confirmPassword: newPassword };

    // When
    const response = await authClient.resetPassword(payload);

    // Then
    const error = await json<ApiErrorResponse>(response, 400);
    expect(error.message === 'Invalid password reset token', 'Unknown token error').toBe(true);
    const rejected = await authClient.signIn({ username: user.username, password: payload.newPassword });
    expect(rejected.status()).toBe(422);
    expectJsonResponse(rejected);
    const login = await authClient.signIn({ username: user.username, password: user.password });
    expect(login.status()).toBe(200);
    expectJsonResponse(login);
    expectNoStoreResponse(login);
    const session = (await login.json()) as LoginResponse;
    expect(session.mfaRequired).toBe(false);
    expect(typeof session.token === 'string' && session.token.length > 0, 'Access token supplied without exposing it').toBe(true);
    const profile = await usersClient.getMe(session.token!);
    expectRegisteredUserProfile(await json<UserResponse>(profile), user);
  });
});
