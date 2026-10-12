import { AuthClient } from '../../../clients/auth.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectInvalidRefreshToken, expectRefreshedTokens } from '../../../support/assertions/auth';
import { expectJsonResponse, expectNoStoreResponse, expectNonEmptyString } from '../../../support/assertions/http';
import type { LoginResponse } from '../../../types/auth';

test.describe('POST /api/v1/users/logout', () => {
  test.describe.configure({ retries: 0 });

  let authClient: AuthClient;

  test.beforeEach(({ request }) => {
    authClient = new AuthClient(request);
  });

  test.describe('200', () => {
    test('logs out with an empty response and revokes refresh tokens from every session', async ({ authenticatedUser }) => {
      const { user, token, refreshToken } = authenticatedUser;
      const secondRefreshToken = await test.step('Given another signed-in session for the same user', async () => {
        const response = await authClient.signIn({ username: user.username, password: user.password });
        expect(response.status()).toBe(200);
        const body = (await response.json()) as LoginResponse;
        expectNonEmptyString(body.refreshToken);
        expect(body.refreshToken !== refreshToken, 'Sessions must have distinct refresh tokens').toBe(true);
        return body.refreshToken;
      });
      const response = await test.step('When logging out with the authenticated access token', () =>
        authClient.logout(token),
      );
      await test.step('Then verify the empty 200 response cannot be cached', async () => {
        expect(response.status()).toBe(200);
        expectNoStoreResponse(response);
        expect(await response.text()).toBe('');
      });
      for (const [index, sessionRefreshToken] of [refreshToken, secondRefreshToken].entries()) {
        await test.step(`Then verify session ${index + 1} can no longer refresh`, async () => {
          const refresh = await authClient.refresh({ refreshToken: sessionRefreshToken });
          await expectInvalidRefreshToken(refresh);
        });
      }

      await test.step('Then verify a fresh sign-in can create a usable refresh session', async () => {
        const signIn = await authClient.signIn({ username: user.username, password: user.password });
        expect(signIn.status()).toBe(200);
        const body = (await signIn.json()) as LoginResponse;
        expectNonEmptyString(body.refreshToken);
        const refreshed = await authClient.refresh({ refreshToken: body.refreshToken });
        await expectRefreshedTokens(refreshed, body.refreshToken);
      });
    });
  });

  test.describe('401', () => {
    for (const { title, token } of [
      { title: 'without Authorization', token: undefined },
      { title: 'with a malformed Bearer token', token: 'not-a-jwt' },
    ]) {
      test(`rejects logout ${title}`, async () => {
        const response = await test.step(`When logging out ${title}`, () => authClient.logout(token));
        await test.step('Then verify the 401 JSON authentication error cannot be cached', async () => {
          expect(response.status()).toBe(401);
          expectJsonResponse(response);
          expectNoStoreResponse(response);
          expectNonEmptyString((await response.json()).message);
        });
      });
    }
  });
});
