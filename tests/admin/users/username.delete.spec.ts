import { AuthClient } from '../../../clients/auth.client';
import { UsersClient } from '../../../clients/users.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { generateRegistrationData } from '../../../generators/registration.generator';
import { expectJsonResponse } from '../../../support/assertions/http';
import { expectRegisteredUserProfile } from '../../../support/assertions/users';
import type { RegistrationRequest } from '../../../types/registration';

test.describe('DELETE /api/v1/users/{username}', () => {
  let authClient: AuthClient;
  let usersClient: UsersClient;
  let user: RegistrationRequest;
  let registered: boolean;

  test.beforeEach(({ request }) => {
    authClient = new AuthClient(request);
    usersClient = new UsersClient(request);
    user = generateRegistrationData();
    registered = false;
  });

  test.afterEach(async ({ authenticatedAdmin }) => {
    if (!registered) return;
    await test.step('Then clean up the disposable user, allowing an already deleted target', async () => {
      const response = await usersClient.deleteUser(user.username, authenticatedAdmin.token);
      expect([204, 404]).toContain(response.status());
      const read = await usersClient.getUser(user.username, authenticatedAdmin.token);
      expect(read.status()).toBe(404);
    });
  });

  async function registerUser(): Promise<void> {
    await test.step('Given a unique disposable staging user', async () => {
      const response = await authClient.signUp(user);
      registered = response.status() === 201;
      expect(response.status()).toBe(201);
    });
  }

  async function expectUserPresent(token: string): Promise<void> {
    const read = await usersClient.getUser(user.username, token);
    expect(read.status()).toBe(200);
    expectRegisteredUserProfile(await read.json(), user);
  }

  test('204: admin deletes a disposable user', async ({ authenticatedAdmin }) => {
    await registerUser();
    const response = await test.step('When the admin deletes the disposable user', () =>
      usersClient.deleteUser(user.username, authenticatedAdmin.token),
    );
    await test.step('Then deletion returns an empty response and the user is absent', async () => {
      expect(response.status()).toBe(204);
      expect(await response.text()).toBe('');
      expect((await usersClient.getUser(user.username, authenticatedAdmin.token)).status()).toBe(404);
    });
  });

  test('401: rejects user deletion without authentication', async ({ authenticatedAdmin }) => {
    await registerUser();
    const response = await test.step('When an anonymous caller deletes an existing user', () =>
      usersClient.deleteUser(user.username),
    );
    await test.step('Then authentication is required and the user remains intact', async () => {
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
      await expectUserPresent(authenticatedAdmin.token);
    });
  });

  test('403: rejects user deletion by a staging client, including the owner', async ({ authenticatedAdmin }) => {
    await registerUser();
    const token = await test.step('Given the disposable user is signed in as a client', async () => {
      const response = await authClient.signIn({ username: user.username, password: user.password });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.roles).toEqual(['ROLE_CLIENT']);
      expect(typeof body.token === 'string' && body.token.trim().length > 0).toBe(true);
      return body.token as string;
    });
    const response = await test.step('When the client deletes its own user through the admin endpoint', () =>
      usersClient.deleteUser(user.username, token),
    );
    await test.step('Then the admin role is required and the user remains intact', async () => {
      expect(response.status()).toBe(403);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Access denied' });
      await expectUserPresent(authenticatedAdmin.token);
    });
  });

  test('404: rejects deletion of a nonexistent user', async ({ authenticatedAdmin }) => {
    await registerUser();
    await test.step('Given the disposable user has been deleted and is absent', async () => {
      expect((await usersClient.deleteUser(user.username, authenticatedAdmin.token)).status()).toBe(204);
      expect((await usersClient.getUser(user.username, authenticatedAdmin.token)).status()).toBe(404);
    });
    const response = await test.step('When the admin deletes that absent username', () =>
      usersClient.deleteUser(user.username, authenticatedAdmin.token),
    );
    await test.step('Then a JSON not-found error is returned', async () => {
      expect(response.status()).toBe(404);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: "The user doesn't exist" });
    });
  });
});
