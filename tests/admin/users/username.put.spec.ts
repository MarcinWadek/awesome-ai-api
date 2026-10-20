import { randomUUID } from 'node:crypto';
import { UsersClient } from '../../../clients/users.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectJsonResponse } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { AuthenticatedUser } from '../../../fixtures/auth.fixture';
import type { RegistrationRequest } from '../../../types/registration';

test.describe('PUT /api/v1/users/{username}', () => {
  let usersClient: UsersClient;
  let data: Pick<RegistrationRequest, 'email' | 'firstName' | 'lastName'>;

  test.beforeEach(({ request }) => {
    usersClient = new UsersClient(request);
    data = {
      email: `updated-${randomUUID()}@example.invalid`,
      firstName: 'Updated',
      lastName: 'Profile',
    };
  });

  async function expectUnchanged(owner: AuthenticatedUser): Promise<void> {
    const read = await usersClient.getUser(owner.user.username, owner.token);
    expect(read.status()).toBe(200);
    expectRegisteredUserProfile(await read.json(), owner.user);
  }

  for (const actor of ['owner', 'admin'] as const) {
    test(`200: ${actor} updates a disposable user profile`, async ({ authenticatedUser, authenticatedAdmin }) => {
      const original = await test.step('Given the disposable owner profile before the update', async () => {
        const response = await usersClient.getUser(authenticatedUser.user.username, authenticatedUser.token);
        expect(response.status()).toBe(200);
        const profile = await response.json();
        expectRegisteredUserProfile(profile, authenticatedUser.user);
        return profile;
      });
      const token = actor === 'owner' ? authenticatedUser.token : authenticatedAdmin.token;
      const response = await test.step(`When the ${actor} updates the disposable user's editable fields`, () =>
        usersClient.updateUser(authenticatedUser.user.username, data, token),
      );
      await test.step('Then the update is returned and persisted with identity and client role intact', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const expected = { ...authenticatedUser.user, ...data };
        const updated = await response.json();
        expectRegisteredUserProfile(updated, expected);
        expect(updated.id).toBe(original.id);
        const read = await usersClient.getUser(authenticatedUser.user.username, authenticatedUser.token);
        expect(read.status()).toBe(200);
        expectJsonResponse(read);
        const persisted = await read.json();
        expectRegisteredUserProfile(persisted, expected);
        expect(persisted.id).toBe(original.id);
      });
    });
  }

  test('400: rejects an invalid user payload', async ({ authenticatedUser }) => {
    const response = await test.step('When the owner updates its profile with an invalid email', () =>
      usersClient.updateUser(authenticatedUser.user.username, { ...data, email: 'invalid' }, authenticatedUser.token),
    );
    await test.step('Then validation identifies the email and leaves all profile fields unchanged', async () => {
      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ email: 'Email should be valid' });
      await expectUnchanged(authenticatedUser);
    });
  });

  test('401: rejects user updates without authentication', async ({ authenticatedUser }) => {
    const response = await test.step('When an anonymous caller submits valid data for an existing user', () =>
      usersClient.updateUser(authenticatedUser.user.username, data),
    );
    await test.step('Then authentication is required and the profile is unchanged', async () => {
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
      await expectUnchanged(authenticatedUser);
    });
  });

  test('403: rejects user updates by another staging client', async ({ authenticatedUser, authenticatedPeer }) => {
    const response = await test.step('When another client submits valid data for the owner profile', () =>
      usersClient.updateUser(authenticatedUser.user.username, data, authenticatedPeer.token),
    );
    await test.step('Then access is denied and both client profiles are unchanged', async () => {
      expect(response.status()).toBe(403);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Access denied' });
      await expectUnchanged(authenticatedUser);
      await expectUnchanged(authenticatedPeer);
    });
  });
});
