import type { ApiErrorResponse } from '../../../types/auth';
import { randomUUID } from 'node:crypto';
import { test } from '../../../fixtures/auth.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
test.describe('GET /api/v1/users/{username}', () => {
  test('200: returns the caller profile by username', async ({ authenticatedUser, usersClient }) => {
    // When
    const response = await usersClient.getUser(authenticatedUser.user.username, authenticatedUser.token);

    // Then
    expectRegisteredUserProfile(await json(response), authenticatedUser.user);
  });

  test('401: rejects missing authentication', async ({ authenticatedUser, usersClient }) => {
    // When
    const response = await usersClient.getUser(authenticatedUser.user.username);

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
  });

  test('404: returns not found for an absent username', async ({ authenticatedUser, usersClient }) => {
    // Given
    const username = `absent_${randomUUID()}`;

    // When
    const response = await usersClient.getUser(username, authenticatedUser.token);

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 404)).message);
  });
});
