import { expect, test } from '@playwright/test';
import { AuthClient } from '../../../clients/auth.client';
import { generateRegistrationData } from '../../../generators/registration.generator';
import { expectJsonResponse, expectNoStoreResponse } from '../../../support/assertions/http';
import type { LoginResponse } from '../../../types/auth';

test.use({ trace: 'off' });

test.describe('POST /api/v1/users/signup', () => {
  test.describe.configure({ retries: 0 });

  let authClient: AuthClient;

  test.beforeEach(({ request }) => {
    authClient = new AuthClient(request);
  });

  test.describe('201', () => {
    test('registers a user who can sign in with client privileges', async () => {
      const user = generateRegistrationData();
      const response = await authClient.signUp(user);

      expect(response.status()).toBe(201);
      expectNoStoreResponse(response);
      expect(await response.text()).toBe('');

      const signIn = await authClient.signIn({ username: user.username, password: user.password });
      expect(signIn.status()).toBe(200);
      expectJsonResponse(signIn);
      const body = (await signIn.json()) as LoginResponse;
      expect(body.username).toBe(user.username);
      expect(body.email).toBe(user.email);
      expect(body.firstName).toBe(user.firstName);
      expect(body.lastName).toBe(user.lastName);
      expect(body.roles).toEqual(['ROLE_CLIENT']);
      expect(typeof body.token === 'string' && body.token.length > 0).toBe(true);
    });
  });

  test.describe('400', () => {
    test('reports missing required fields', async () => {
      const response = await authClient.signUp({});

      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({
        username: 'Username is required',
        email: 'Email is required',
        password: 'Password is required',
        firstName: 'firstName is required',
        lastName: 'lastName is required',
      });
    });

    for (const field of ['username', 'email'] as const) {
      test(`rejects a duplicate ${field}`, async () => {
        const original = generateRegistrationData();
        const created = await authClient.signUp(original);
        expect(created.status()).toBe(201);

        const duplicate = generateRegistrationData({ [field]: original[field] });
        const response = await authClient.signUp(duplicate);

        expect(response.status()).toBe(400);
        expectJsonResponse(response);
        expect(await response.json()).toEqual({
          message: field === 'username' ? 'Username is already in use' : 'Email is already in use',
        });
      });
    }
  });
});
