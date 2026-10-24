import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNoStoreResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { ApiErrorResponse } from '../../../types/auth';
import type { UserResponse } from '../../../types/users';
test.describe('GET /api/v1/users/me', () => {
  test('200: returns the newly registered account for its login JWT', async ({ authenticatedUser, usersClient }) => {
    // Given
    const { user, token } = authenticatedUser;

    // When
    const response = await usersClient.getMe(token);

    // Then
    expect(response.status()).toBe(200);
    expectJsonResponse(response);
    expectNoStoreResponse(response);
    const body = (await response.json()) as UserResponse;
    expectRegisteredUserProfile(body, user);
  });

  for (const { title, token } of [{ title: 'rejects a request without Authorization', token: undefined }, { title: 'rejects a malformed Bearer token', token: 'not-a-jwt' }]) {
    test(`401: ${title}`, async ({ usersClient }) => {
      // When
      const response = await usersClient.getMe(token);

      // Then
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expectNoStoreResponse(response);
      const body = (await response.json()) as ApiErrorResponse;
      expectNonEmptyString(body.message);
    });
  }

  test('401: rejects a login JWT with an altered signature', async ({ authenticatedUser, usersClient }) => {
    // Given
    const parts = authenticatedUser.token.split('.');
    if (parts.length !== 3 || !parts[2]) {
      throw new Error('Sign-in must return a signed JWT with three nonempty segments');
    }
    const signature = parts[2];
    parts[2] = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
    const alteredToken = parts.join('.');

    // When
    const response = await usersClient.getMe(alteredToken);

    // Then
    expect(response.status()).toBe(401);
    expectJsonResponse(response);
    expectNoStoreResponse(response);
    const body = (await response.json()) as ApiErrorResponse;
    expectNonEmptyString(body.message);
  });
});
