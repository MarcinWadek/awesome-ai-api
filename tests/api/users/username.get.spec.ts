import { randomUUID } from 'node:crypto';
import { UsersClient } from '../../../clients/users.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';

test.describe('GET /api/v1/users/{username}', () => {
  test.describe.configure({ retries: 0 });
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    usersClient = new UsersClient(request);
  });

  test.describe('200', () => {
    test('returns the caller profile by username', async ({ authenticatedUser }) => {
      const response = await test.step('When the caller looks up its registered username', () =>
        usersClient.getUser(authenticatedUser.user.username, authenticatedUser.token),
      );
      await test.step('Then the 200 JSON profile matches the registered identity without credentials', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        expectRegisteredUserProfile(await response.json(), authenticatedUser.user);
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async ({ authenticatedUser }) => {
      const response = await test.step('When an existing username is requested without authentication', () =>
        usersClient.getUser(authenticatedUser.user.username),
      );
      await test.step('Then the response is a 401 JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
    });
  });

  test.describe('404', () => {
    test('returns not found for an absent username', async ({ authenticatedUser }) => {
      const username = await test.step('Given a unique username that was never registered', async () =>
        `absent_${randomUUID()}`,
      );
      const response = await test.step('When the client looks up the absent username', () =>
        usersClient.getUser(username, authenticatedUser.token),
      );
      await test.step('Then the response is a 404 JSON not-found error', async () => {
        expect(response.status()).toBe(404);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
    });
  });
});
