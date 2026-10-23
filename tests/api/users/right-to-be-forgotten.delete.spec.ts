import { AuthClient } from '../../../clients/auth.client';
import { UsersClient } from '../../../clients/users.client';
import { expect, test } from '../../../fixtures/account-lifecycle.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';

test.describe('DELETE /api/v1/users/{username}/right-to-be-forgotten', () => {
  test.describe.configure({ retries: 0 });

  let authClient: AuthClient;
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    authClient = new AuthClient(request);
    usersClient = new UsersClient(request);
  });

  test.describe('204', () => {
    test('deletes the owner account and revokes its saved refresh token', async ({ lifecycleUser, authenticatedUser }) => {
      const { user, token, refreshToken } = lifecycleUser;
      const response = await test.step('When the owner deletes its account', () =>
        usersClient.forgetUser(user.username, token),
      );

      await test.step('Then deletion succeeds with an empty 204 response', async () => {
        expect(response.status()).toBe(204);
        expect(await response.body()).toHaveLength(0);
      });

      const profile = await test.step('Then an independent user cannot find the deleted profile', () =>
        usersClient.getUser(user.username, authenticatedUser.token),
      );
      await test.step('Verify the profile is absent', async () => {
        expect(profile.status()).toBe(404);
        expectJsonResponse(profile);
        expectNonEmptyString((await profile.json()).message);
      });

      const refreshed = await test.step('Then the deleted account refresh token is rejected', () =>
        authClient.refresh({ refreshToken }),
      );
      await test.step('Verify the refresh session is no longer usable', async () => {
        expect(refreshed.status()).toBe(401);
        expectJsonResponse(refreshed);
        expectNonEmptyString((await refreshed.json()).message);
      });
    });
  });

  test.describe('401', () => {
    test('rejects deletion without authentication', async ({ lifecycleUser, authenticatedUser }) => {
      const response = await test.step('When deletion is requested without a JWT', () =>
        usersClient.forgetUser(lifecycleUser.user.username),
      );
      await test.step('Then the API returns a JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
      const profile = await test.step('Then an independent user confirms the target account remains', () =>
        usersClient.getUser(lifecycleUser.user.username, authenticatedUser.token),
      );
      await test.step('Verify the target profile is still present', async () => {
        expect(profile.status()).toBe(200);
        expectJsonResponse(profile);
        expect((await profile.json()).username).toBe(lifecycleUser.user.username);
      });
    });
  });

  test.describe('403', () => {
    test('preserves the account when a peer requests deletion', async ({ lifecycleUser, authenticatedUser }) => {
      const response = await test.step('When one client requests deletion of a peer account', () =>
        usersClient.forgetUser(lifecycleUser.user.username, authenticatedUser.token),
      );
      await test.step('Then the API forbids the request', async () => {
        expect(response.status()).toBe(403);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });

      const preserved = await test.step('Then the independent peer confirms the target account remains', () =>
        usersClient.getUser(lifecycleUser.user.username, authenticatedUser.token),
      );
      await test.step('Verify the target profile remains present', async () => {
        expect(preserved.status()).toBe(200);
        expectJsonResponse(preserved);
        expect((await preserved.json()).username).toBe(lifecycleUser.user.username);
      });
    });
  });
});
