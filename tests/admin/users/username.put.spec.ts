import type { UserResponse } from '../../../types/users';
import { randomUUID } from 'node:crypto';
import type { UsersClient } from '../../../clients/users.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { json, expectJsonResponse } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { AuthenticatedUser } from '../../../fixtures/auth.fixture';
import type { RegistrationRequest } from '../../../types/registration';
test.describe('PUT /api/v1/users/{username}', () => {
  let data: Pick<RegistrationRequest, 'email' | 'firstName' | 'lastName'>;

  test.beforeEach(() => {
    data = { email: `updated-${randomUUID()}@example.invalid`, firstName: 'Updated', lastName: 'Profile' };
  });

  async function expectUnchanged(usersClient: UsersClient, owner: AuthenticatedUser): Promise<void> {
    const read = await usersClient.getUser(owner.user.username, owner.token);
    expect(read.status()).toBe(200);
    expectRegisteredUserProfile(await read.json(), owner.user);
  }

  for (const actor of ['owner', 'admin'] as const) {
    test(`200: ${actor} updates a disposable user profile`, async ({ authenticatedUser, authenticatedAdmin, usersClient }) => {
      // Given
      const setupResponse = await usersClient.getUser(authenticatedUser.user.username, authenticatedUser.token);
      expect(setupResponse.status()).toBe(200);
      const original = await setupResponse.json();
      expectRegisteredUserProfile(original, authenticatedUser.user);
      const token = actor === 'owner' ? authenticatedUser.token : authenticatedAdmin.token;

      // When
      const response = await usersClient.updateUser(authenticatedUser.user.username, data, token);

      // Then
      expect(response.status()).toBe(200);
      expectJsonResponse(response);
      const expected = {
        ...authenticatedUser.user,
        ...data
      };
      const updated = await response.json();
      expectRegisteredUserProfile(updated, expected);
      expect(updated.id).toBe(original.id);
      const read = await usersClient.getUser(authenticatedUser.user.username, authenticatedUser.token);
      const persisted = await json<UserResponse>(read);
      expectRegisteredUserProfile(persisted, expected);
      expect(persisted.id).toBe(original.id);
    });
  }

  test('400: rejects an invalid user payload', async ({ authenticatedUser, usersClient }) => {
    // When
    const response = await usersClient.updateUser(authenticatedUser.user.username, {
      ...data,
      email: 'invalid'
    }, authenticatedUser.token);

    // Then
    expect(await json(response, 400)).toEqual({ email: 'Email should be valid' });
    await expectUnchanged(usersClient, authenticatedUser);
  });

  test('401: rejects user updates without authentication', async ({ authenticatedUser, usersClient }) => {
    // When
    const response = await usersClient.updateUser(authenticatedUser.user.username, data);

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectUnchanged(usersClient, authenticatedUser);
  });

  test('403: rejects user updates by another staging client', async ({ authenticatedUser, authenticatedPeer, usersClient }) => {
    // When
    const response = await usersClient.updateUser(authenticatedUser.user.username, data, authenticatedPeer.token);

    // Then
    expect(await json(response, 403)).toEqual({ message: 'Access denied' });
    await expectUnchanged(usersClient, authenticatedUser);
    await expectUnchanged(usersClient, authenticatedPeer);
  });
});
