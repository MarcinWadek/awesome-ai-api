import { expect, test } from '../../../fixtures/auth.fixture';
import { expectInvalidRefreshToken, expectRefreshedTokens } from '../../../support/assertions/auth';
import { json, expectJsonResponse, expectNoStoreResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import { invalidRefreshTokenCases } from '../../../data/auth';
import type { UserResponse } from '../../../types/users';
test.describe('POST /api/v1/users/refresh', () => {
  test('200: rotates tokens without Bearer authorization and returns a usable session', async ({ authenticatedUser, authClient, usersClient }) => {
    // Given
    const { user, refreshToken } = authenticatedUser;

    // When
    const response = await authClient.refresh({ refreshToken });

    // Then
    const tokens = await expectRefreshedTokens(response, refreshToken);
    const profile = await usersClient.getMe(tokens.token);
    expectRegisteredUserProfile(await json<UserResponse>(profile), user);

    // When
    const replacement = await authClient.refresh({ refreshToken: tokens.refreshToken });

    // Then
    await expectRefreshedTokens(replacement, tokens.refreshToken);
  });

  for (const { title, data } of invalidRefreshTokenCases) {
    test(`400: rejects ${title} refresh token input`, async ({ authClient }) => {
      // When
      const response = await authClient.refresh(data);

      // Then
      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      expectNoStoreResponse(response);
      const body = await response.json();
      expectNonEmptyString(body.refreshToken);
    });
  }

  test('401: rejects an unknown refresh token', async ({ authClient }) => {
    // When
    const response = await authClient.refresh({ refreshToken: 'not-a-refresh-token' });

    // Then
    await expectInvalidRefreshToken(response);
  });

  test('401: rejects an access JWT used as a refresh token', async ({ authenticatedUser, authClient }) => {
    // When
    const response = await authClient.refresh({ refreshToken: authenticatedUser.token });

    // Then
    await expectInvalidRefreshToken(response);
  });

  test('401: rejects reuse of a consumed refresh token', async ({ authenticatedUser, authClient }) => {
    // Given
    const { refreshToken } = authenticatedUser;
    const response = await authClient.refresh({ refreshToken });
    await expectRefreshedTokens(response, refreshToken);

    // When
    const replay = await authClient.refresh({ refreshToken });

    // Then
    await expectInvalidRefreshToken(replay);
  });

  test('401: rejects a stale Bearer token even with a valid refresh token', async ({ authenticatedUser, authClient }) => {
    // When
    const response = await authClient.refresh({ refreshToken: authenticatedUser.refreshToken }, { Authorization: 'Bearer expired-or-invalid-token' });

    // Then
    expect(response.status()).toBe(401);
    expectJsonResponse(response);
    expectNoStoreResponse(response);
    expectNonEmptyString((await response.json()).message);
    const { refreshToken } = authenticatedUser;
    const retry = await authClient.refresh({ refreshToken });
    await expectRefreshedTokens(retry, refreshToken);
  });
});
