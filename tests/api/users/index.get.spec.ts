import type { ApiErrorResponse } from '../../../types/auth';
import { expect, test } from '../../../fixtures/auth.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { UserResponse } from '../../../types/users';
test.describe('GET /api/v1/users', () => {
  test('200: returns a user list containing the registered client profile', async ({ authenticatedUser, usersClient }) => {
    // When
    const response = await usersClient.getUsers(authenticatedUser.token);

    // Then
    const users = await json<UserResponse[]>(response);
    expect(Array.isArray(users)).toBe(true);
    const matches = users.filter(user => user.username === authenticatedUser.user.username);
    expect(matches).toHaveLength(1);
    expectRegisteredUserProfile(matches[0], authenticatedUser.user);
  });

  test('401: rejects missing authentication', async ({ usersClient }) => {
    // When
    const response = await usersClient.getUsers();

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
  });
});
