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
      const user = await test.step('Generate unique registration data', async () =>
        generateRegistrationData(),
      );
      const response = await test.step('Register the user', () => authClient.signUp(user));

      await test.step('Verify the empty 201 response cannot be cached', async () => {
        expect(response.status()).toBe(201);
        expectNoStoreResponse(response);
        expect(await response.text()).toBe('');
      });

      const signIn = await test.step('Sign in as the registered user', () =>
        authClient.signIn({ username: user.username, password: user.password }),
      );
      await test.step('Verify the 200 JSON sign-in response', async () => {
        expect(signIn.status()).toBe(200);
        expectJsonResponse(signIn);
      });
      await test.step('Verify the registered identity, client privileges, and session token', async () => {
        const body = (await signIn.json()) as LoginResponse;
        expect(body.username).toBe(user.username);
        expect(body.email).toBe(user.email);
        expect(body.firstName).toBe(user.firstName);
        expect(body.lastName).toBe(user.lastName);
        expect(body.roles).toEqual(['ROLE_CLIENT']);
        expect(typeof body.token === 'string' && body.token.length > 0).toBe(true);
      });
    });
  });

  test.describe('400', () => {
    test('reports missing required fields', async () => {
      const response = await test.step('Register without required fields', () => authClient.signUp({}));

      await test.step('Verify the 400 JSON response', async () => {
        expect(response.status()).toBe(400);
        expectJsonResponse(response);
      });
      await test.step('Verify validation messages for all required fields', async () => {
        expect(await response.json()).toEqual({
          username: 'Username is required',
          email: 'Email is required',
          password: 'Password is required',
          firstName: 'firstName is required',
          lastName: 'lastName is required',
        });
      });
    });

    for (const field of ['username', 'email'] as const) {
      test(`rejects a duplicate ${field}`, async () => {
        const original = await test.step('Register an original user successfully', async () => {
          const user = generateRegistrationData();
          const created = await authClient.signUp(user);
          expect(created.status()).toBe(201);
          return user;
        });

        const response = await test.step(`Register another user with the same ${field}`, () => {
          const duplicate = generateRegistrationData({ [field]: original[field] });
          return authClient.signUp(duplicate);
        });

        await test.step('Verify the 400 JSON response', async () => {
          expect(response.status()).toBe(400);
          expectJsonResponse(response);
        });
        await test.step(`Verify the duplicate ${field} error message`, async () => {
          expect(await response.json()).toEqual({
            message: field === 'username' ? 'Username is already in use' : 'Email is already in use',
          });
        });
      });
    }
  });
});
