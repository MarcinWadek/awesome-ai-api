import type { UserResponse } from '../../../types/users';
import type { ApiErrorResponse } from '../../../types/auth';
import { expect, test } from '../../../fixtures/account-lifecycle.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
test.describe('DELETE /api/v1/users/{username}/right-to-be-forgotten', () => {
  test('204: deletes the owner account and revokes its saved refresh token', async ({ lifecycleUser, authenticatedUser, authClient, usersClient }) => {
    // Given
    const { user, token, refreshToken } = lifecycleUser;

    // When
    const response = await usersClient.forgetUser(user.username, token);

    // Then
    expect(response.status()).toBe(204);
    expect(await response.body()).toHaveLength(0);
    const profile = await usersClient.getUser(user.username, authenticatedUser.token);
    expectNonEmptyString((await json<ApiErrorResponse>(profile, 404)).message);
    const refreshed = await authClient.refresh({ refreshToken });
    expectNonEmptyString((await json<ApiErrorResponse>(refreshed, 401)).message);
  });

  test('401: rejects deletion without authentication', async ({ lifecycleUser, authenticatedUser, usersClient }) => {
    // When
    const response = await usersClient.forgetUser(lifecycleUser.user.username);

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
    const profile = await usersClient.getUser(lifecycleUser.user.username, authenticatedUser.token);
    expect((await json<UserResponse>(profile)).username).toBe(lifecycleUser.user.username);
  });

  test('403: preserves the account when a peer requests deletion', async ({ lifecycleUser, authenticatedUser, usersClient }) => {
    // When
    const response = await usersClient.forgetUser(lifecycleUser.user.username, authenticatedUser.token);

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 403)).message);
    const preserved = await usersClient.getUser(lifecycleUser.user.username, authenticatedUser.token);
    expect((await json<UserResponse>(preserved)).username).toBe(lifecycleUser.user.username);
  });
});
