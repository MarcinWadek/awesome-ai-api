import { test, expect } from '../../../fixtures/admin.fixture';
import { adminApiConfig } from '../../../support/config';
import { json } from '../../../support/assertions/http';
import type { UserResponse } from '../../../types/users';
test.describe('POST /api/v1/users/signin (admin)', () => {
  test('200: returns a usable admin session', async ({ authenticatedAdmin, usersClient }) => {
    // When
    const response = await usersClient.getMe(authenticatedAdmin.token);

    // Then
    const profile = await json<UserResponse>(response);
    expect(profile.username === adminApiConfig.validLoginCredentials.username).toBe(true);
    expect(Array.isArray(profile.roles) && profile.roles.includes('ROLE_ADMIN')).toBe(true);
  });
});
