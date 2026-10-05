import { AuthClient } from '../../../clients/auth.client';
import { UsersClient } from '../../../clients/users.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectInvalidRefreshToken, expectRefreshedTokens } from '../../../support/assertions/auth';
import { expectJsonResponse, expectNoStoreResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { RefreshTokenRequest } from '../../../types/auth';
import type { UserResponse } from '../../../types/users';

test.describe('POST /api/v1/users/refresh', () => {
  test.describe.configure({ retries: 0 });

  let authClient: AuthClient;
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    authClient = new AuthClient(request);
    usersClient = new UsersClient(request);
  });

  test.describe('200', () => {
    test('rotates tokens without Bearer authorization and returns a usable session', async ({ authenticatedUser }) => {
      const { user, refreshToken } = authenticatedUser;
      const response = await test.step('When refreshing the signed-in session without Authorization', () =>
        authClient.refresh({ refreshToken }),
      );
      const tokens = await test.step('Then verify the 200 JSON response, no-store header, and rotated tokens', () =>
        expectRefreshedTokens(response, refreshToken),
      );

      await test.step('Then verify the refreshed access token identifies the registered user', async () => {
        const profile = await usersClient.getMe(tokens.token);
        expect(profile.status()).toBe(200);
        expectJsonResponse(profile);
        expectRegisteredUserProfile((await profile.json()) as UserResponse, user);
      });

      const replacement = await test.step('When refreshing with the replacement refresh token', () =>
        authClient.refresh({ refreshToken: tokens.refreshToken }),
      );
      await test.step('Then verify the replacement token can rotate again', () =>
        expectRefreshedTokens(replacement, tokens.refreshToken),
      );
    });
  });

  test.describe('400', () => {
    for (const { title, data } of [
      { title: 'missing', data: {} },
      { title: 'empty', data: { refreshToken: '' } },
      { title: 'whitespace-only', data: { refreshToken: '   ' } },
    ] satisfies Array<{ title: string; data: Partial<RefreshTokenRequest> }>) {
      test(`rejects ${title} refresh token input`, async () => {
        const response = await test.step(`When refreshing with ${title} refresh token input`, () =>
          authClient.refresh(data),
        );
        await test.step('Then verify the 400 JSON validation error for refreshToken', async () => {
          expect(response.status()).toBe(400);
          expectJsonResponse(response);
          expectNoStoreResponse(response);
          const body = await response.json();
          expectNonEmptyString(body.refreshToken);
        });
      });
    }
  });

  test.describe('401', () => {
    test('rejects an unknown refresh token', async () => {
      const response = await test.step('When refreshing with an unknown token', () =>
        authClient.refresh({ refreshToken: 'not-a-refresh-token' }),
      );
      await test.step('Then verify the 401 invalid refresh token response', () =>
        expectInvalidRefreshToken(response),
      );
    });

    test('rejects an access JWT used as a refresh token', async ({ authenticatedUser }) => {
      const response = await test.step('When refreshing with an access JWT', () =>
        authClient.refresh({ refreshToken: authenticatedUser.token }),
      );
      await test.step('Then verify the 401 invalid refresh token response', () =>
        expectInvalidRefreshToken(response),
      );
    });

    test('rejects reuse of a consumed refresh token', async ({ authenticatedUser }) => {
      const { refreshToken } = authenticatedUser;
      await test.step('Given a successfully rotated refresh token', async () => {
        const response = await authClient.refresh({ refreshToken });
        return expectRefreshedTokens(response, refreshToken);
      });
      const replay = await test.step('When reusing the consumed refresh token', () =>
        authClient.refresh({ refreshToken }),
      );
      await test.step('Then verify the consumed token is rejected with 401', () =>
        expectInvalidRefreshToken(replay),
      );
    });

    test('rejects a stale Bearer token even with a valid refresh token', async ({ authenticatedUser }) => {
      const response = await test.step('When refreshing with stale Bearer authorization', () =>
        authClient.refresh(
          { refreshToken: authenticatedUser.refreshToken },
          { Authorization: 'Bearer expired-or-invalid-token' },
        ),
      );
      await test.step('Then verify the 401 JSON authentication error cannot be cached', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNoStoreResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
      await test.step('Then verify the rejected request did not consume the refresh token', async () => {
        const { refreshToken } = authenticatedUser;
        const retry = await authClient.refresh({ refreshToken });
        await expectRefreshedTokens(retry, refreshToken);
      });
    });
  });
});
