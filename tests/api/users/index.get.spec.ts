import { UsersClient } from '../../../clients/users.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { UserResponse } from '../../../types/users';

test.describe('GET /api/v1/users', () => {
  test.describe.configure({ retries: 0 });
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    usersClient = new UsersClient(request);
  });

  test.describe('200', () => {
    test('returns a user list containing the registered client profile', async ({ authenticatedUser }) => {
      const response = await test.step('When a client lists user accounts', () =>
        usersClient.getUsers(authenticatedUser.token),
      );
      await test.step('Then the 200 JSON array includes the registered profile without credentials', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const users = (await response.json()) as UserResponse[];
        expect(Array.isArray(users)).toBe(true);
        const matches = users.filter((user) => user.username === authenticatedUser.user.username);
        expect(matches).toHaveLength(1);
        expectRegisteredUserProfile(matches[0], authenticatedUser.user);
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async () => {
      const response = await test.step('When accounts are listed without authentication', () =>
        usersClient.getUsers(),
      );
      await test.step('Then the response is a 401 JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
    });
  });
});
