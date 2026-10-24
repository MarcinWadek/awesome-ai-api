import { expect, test } from '../../../fixtures/auth.fixture';
import { expectInvalidRefreshToken, expectRefreshedTokens } from '../../../support/assertions/auth';
import { expectJsonResponse, expectNoStoreResponse, expectNonEmptyString } from '../../../support/assertions/http';
import type { LoginResponse } from '../../../types/auth';
test.describe('POST /api/v1/users/logout', () => {
  test('200: logs out with an empty response and revokes refresh tokens from every session', async ({ authenticatedUser, authClient }) => {
    // Given
    const { user, token, refreshToken } = authenticatedUser;
    const setupResponse = await authClient.signIn({ username: user.username, password: user.password });
    expect(setupResponse.status()).toBe(200);
    const body = (await setupResponse.json()) as LoginResponse;
    expectNonEmptyString(body.refreshToken);
    expect(body.refreshToken !== refreshToken, 'Sessions must have distinct refresh tokens').toBe(true);
    const secondRefreshToken = body.refreshToken;

    // When
    const response = await authClient.logout(token);

    // Then
    expect(response.status()).toBe(200);
    expectNoStoreResponse(response);
    expect(await response.text()).toBe('');

    for (const sessionRefreshToken of [refreshToken, secondRefreshToken]) {
      // Then
      const refresh = await authClient.refresh({ refreshToken: sessionRefreshToken });
      await expectInvalidRefreshToken(refresh);
    }
    const signIn = await authClient.signIn({ username: user.username, password: user.password });
    expect(signIn.status()).toBe(200);
    const verifiedBody = (await signIn.json()) as LoginResponse;
    expectNonEmptyString(verifiedBody.refreshToken);
    const refreshed = await authClient.refresh({ refreshToken: verifiedBody.refreshToken });
    await expectRefreshedTokens(refreshed, verifiedBody.refreshToken);
  });

  for (const { title, token } of [{ title: 'without Authorization', token: undefined }, { title: 'with a malformed Bearer token', token: 'not-a-jwt' }]) {
    test(`401: rejects logout ${title}`, async ({ authClient }) => {
      // When
      const response = await authClient.logout(token);

      // Then
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expectNoStoreResponse(response);
      expectNonEmptyString((await response.json()).message);
    });
  }
});
