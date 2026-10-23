import { UsersClient } from '../../../clients/users.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';

test.describe('GET /api/v1/users/me/email-events', () => {
  test.describe.configure({ retries: 0 });

  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    usersClient = new UsersClient(request);
  });

  test.describe('200', () => {
    test('returns no events for a fresh account', async ({ authenticatedUser }) => {
      const response = await test.step('When a new user reads its email events', () =>
        usersClient.getEmailEvents(authenticatedUser.token),
      );
      await test.step('Then the API returns an empty JSON array', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        expect(await response.json()).toEqual([]);
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async () => {
      const response = await test.step('When email events are requested without a JWT', () =>
        usersClient.getEmailEvents(),
      );
      await test.step('Then the API returns a JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
    });
  });
});
