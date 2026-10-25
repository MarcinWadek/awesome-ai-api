import type { AuthClient } from '../../../clients/auth.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { generateRegistrationData } from '../../../generators/registration.generator';
import { json } from '../../../support/assertions/http';
import { expectPersistedUser } from '../../../support/assertions/users';
import type { RegistrationRequest } from '../../../types/registration';
test.describe('DELETE /api/v1/users/{username}', () => {
  let user: RegistrationRequest;
  let registered: boolean;

  test.beforeEach(() => {
    user = generateRegistrationData();
    registered = false;
  });

  test.afterEach(async ({ authenticatedAdmin, usersClient }) => {
    if (!registered) return;

    // Then
    const response = await usersClient.deleteUser(user.username, authenticatedAdmin.token);
    expect([204, 404]).toContain(response.status());
    const read = await usersClient.getUser(user.username, authenticatedAdmin.token);
    expect(read.status()).toBe(404);
  });

  async function registerUser(authClient: AuthClient): Promise<void> {
    // Given
    const response = await authClient.signUp(user);
    registered = response.status() === 201;
    expect(response.status()).toBe(201);
  }

  test('204: admin deletes a disposable user', async ({ authenticatedAdmin, authClient, usersClient }) => {
    // Given
    await registerUser(authClient);

    // When
    const response = await usersClient.deleteUser(user.username, authenticatedAdmin.token);

    // Then
    expect(response.status()).toBe(204);
    expect(await response.text()).toBe('');
    expect((await usersClient.getUser(user.username, authenticatedAdmin.token)).status()).toBe(404);
  });

  test('401: rejects user deletion without authentication', async ({ authenticatedAdmin, authClient, usersClient }) => {
    // Given
    await registerUser(authClient);

    // When
    const response = await usersClient.deleteUser(user.username);

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectPersistedUser(usersClient, user, authenticatedAdmin.token);
  });

  test('403: rejects user deletion by a staging client, including the owner', async ({ authenticatedAdmin, authClient, usersClient }) => {
    // Given
    await registerUser(authClient);
    const setupResponse = await authClient.signIn({ username: user.username, password: user.password });
    expect(setupResponse.status()).toBe(200);
    const body = await setupResponse.json();
    expect(body.roles).toEqual(['ROLE_CLIENT']);
    expect(typeof body.token === 'string' && body.token.trim().length > 0).toBe(true);
    const token = await (body.token as string);

    // When
    const response = await usersClient.deleteUser(user.username, token);

    // Then
    expect(await json(response, 403)).toEqual({ message: 'Access denied' });
    await expectPersistedUser(usersClient, user, authenticatedAdmin.token);
  });

  test('404: rejects deletion of a nonexistent user', async ({ authenticatedAdmin, authClient, usersClient }) => {
    // Given
    await registerUser(authClient);
    expect((await usersClient.deleteUser(user.username, authenticatedAdmin.token)).status()).toBe(204);
    expect((await usersClient.getUser(user.username, authenticatedAdmin.token)).status()).toBe(404);

    // When
    const response = await usersClient.deleteUser(user.username, authenticatedAdmin.token);

    // Then
    expect(await json(response, 404)).toEqual({ message: "The user doesn't exist" });
  });
});
