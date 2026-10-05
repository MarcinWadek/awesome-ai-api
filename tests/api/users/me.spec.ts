import { UsersClient } from '../../../clients/users.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import {
  expectJsonResponse,
  expectNoStoreResponse,
  expectNonEmptyString,
} from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { ApiErrorResponse } from '../../../types/auth';
import type { UserResponse } from '../../../types/users';

test.describe('GET /api/v1/users/me', () => {
  test.describe.configure({ retries: 0 });

  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    usersClient = new UsersClient(request);
  });

  test.describe('200', () => {
    test('returns the newly registered account for its login JWT', async ({ authenticatedUser }) => {
      const { user, token } = authenticatedUser;
      const response = await test.step('Get the authenticated user', () =>
        usersClient.getMe(token),
      );

      await test.step('Verify the 200 JSON response cannot be cached', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        expectNoStoreResponse(response);
      });

      await test.step('Verify the registered identity and client privileges', async () => {
        const body = (await response.json()) as UserResponse;
        expectRegisteredUserProfile(body, user);
      });
    });
  });

  test.describe('401', () => {
    for (const { title, token } of [
      { title: 'rejects a request without Authorization', token: undefined },
      { title: 'rejects a malformed Bearer token', token: 'not-a-jwt' },
    ]) {
      test(title, async () => {
        const response = await test.step('Get the current user without valid authorization', () =>
          usersClient.getMe(token),
        );

        await test.step('Verify the 401 JSON authentication error cannot be cached', async () => {
          expect(response.status()).toBe(401);
          expectJsonResponse(response);
          expectNoStoreResponse(response);
          const body = (await response.json()) as ApiErrorResponse;
          expectNonEmptyString(body.message);
        });
      });
    }

    test('rejects a login JWT with an altered signature', async ({ authenticatedUser }) => {
      const alteredToken = await test.step('Alter the login JWT signature', async () => {
        const parts = authenticatedUser.token.split('.');
        if (parts.length !== 3 || !parts[2]) {
          throw new Error('Sign-in must return a signed JWT with three nonempty segments');
        }
        const signature = parts[2];
        parts[2] = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
        return parts.join('.');
      });

      const response = await test.step('Get the current user with the altered JWT', () =>
        usersClient.getMe(alteredToken),
      );

      await test.step('Verify the 401 JSON authentication error cannot be cached', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNoStoreResponse(response);
        const body = (await response.json()) as ApiErrorResponse;
        expectNonEmptyString(body.message);
      });
    });
  });
});
