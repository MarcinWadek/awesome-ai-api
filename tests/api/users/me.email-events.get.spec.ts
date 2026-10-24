import type { ApiErrorResponse } from '../../../types/auth';
import { expect, test } from '../../../fixtures/auth.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
test.describe('GET /api/v1/users/me/email-events', () => {
  test('200: returns no events for a fresh account', async ({ authenticatedUser, usersClient }) => {
    // When
    const response = await usersClient.getEmailEvents(authenticatedUser.token);

    // Then
    expect(await json(response)).toEqual([]);
  });

  test('401: rejects missing authentication', async ({ usersClient }) => {
    // When
    const response = await usersClient.getEmailEvents();

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
  });
});
