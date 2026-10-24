import { expect, test } from '../../../fixtures/clients.fixture';
import { generateRegistrationData } from '../../../generators/registration.generator';
import { json, expectNoStoreResponse } from '../../../support/assertions/http';
import type { LoginResponse } from '../../../types/auth';
test.describe('POST /api/v1/users/signup', () => {
  test('201: registers a user who can sign in with client privileges', async ({ authClient }) => {
    // Given
    const user = generateRegistrationData();

    // When
    const response = await authClient.signUp(user);

    // Then
    expect(response.status()).toBe(201);
    expectNoStoreResponse(response);
    expect(await response.text()).toBe('');

    // When
    const signIn = await authClient.signIn({ username: user.username, password: user.password });

    // Then
    const body = await json<LoginResponse>(signIn);
    expect(body.username).toBe(user.username);
    expect(body.email).toBe(user.email);
    expect(body.firstName).toBe(user.firstName);
    expect(body.lastName).toBe(user.lastName);
    expect(body.roles).toEqual(['ROLE_CLIENT']);
    expect(typeof body.token === 'string' && body.token.length > 0).toBe(true);
  });

  test('400: reports missing required fields', async ({ authClient }) => {
    // When
    const response = await authClient.signUp({});

    // Then
    expect(await json(response, 400)).toEqual({
      username: 'Username is required',
      email: 'Email is required',
      password: 'Password is required',
      firstName: 'firstName is required',
      lastName: 'lastName is required'
    });
  });

  for (const field of ['username', 'email'] as const) {
    test(`400: rejects a duplicate ${field}`, async ({ authClient }) => {
      // Given
      const original = generateRegistrationData();
      const created = await authClient.signUp(original);
      expect(created.status()).toBe(201);
      const duplicate = generateRegistrationData({ [field]: original[field] });
      // When
      const response = await authClient.signUp(duplicate);

      // Then
      expect(await json(response, 400)).toEqual({ message: field === 'username' ? 'Username is already in use' : 'Email is already in use' });
    });
  }
});
