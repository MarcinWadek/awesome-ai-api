import { UsersClient } from '../../../clients/users.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { adminApiConfig } from '../../../support/config';
import { expectJsonResponse } from '../../../support/assertions/http';
import type { UserResponse } from '../../../types/users';

test.describe('POST /api/v1/users/signin (admin)', () => {
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    usersClient = new UsersClient(request);
  });

  test('200: returns a usable admin session', async ({ authenticatedAdmin }) => {
    const response = await test.step('When the signed-in admin requests their profile', () =>
      usersClient.getMe(authenticatedAdmin.token),
    );
    await test.step('Then the profile confirms the admin identity and permissions', async () => {
      expect(response.status()).toBe(200);
      expectJsonResponse(response);
      const profile = await response.json() as UserResponse;
      expect(profile.username === adminApiConfig.validLoginCredentials.username).toBe(true);
      expect(Array.isArray(profile.roles) && profile.roles.includes('ROLE_ADMIN')).toBe(true);
    });
  });
});
