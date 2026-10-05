import { expect, test } from '@playwright/test';
import { AuthClient } from '../../../clients/auth.client';
import {
  expectJsonResponse,
  expectNoStoreResponse,
  expectNonEmptyString,
} from '../../../support/assertions/http';
import { apiConfig } from '../../../support/config';
import type { ApiErrorResponse, LoginResponse } from '../../../types/auth';

test.describe('POST /api/v1/users/signin', () => {
  let authClient: AuthClient;

  test.beforeEach(({ request }) => {
    authClient = new AuthClient(request);
  });

  test.describe('200', () => {
    test('returns a usable session token and the authenticated user identity', async () => {
      const response = await test.step('Sign in with valid credentials', () =>
        authClient.signIn(apiConfig.validLoginCredentials),
      );

      await test.step('Verify the 200 JSON response cannot be cached', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        expectNoStoreResponse(response);
      });

      await test.step('Verify the session token and authenticated user identity', async () => {
        const body = (await response.json()) as LoginResponse;
        expectNonEmptyString(body.token);
        expect(body.username).toBe(apiConfig.validLoginCredentials.username);
        expectNonEmptyString(body.email);
      });
    });
  });

  test.describe('401', () => {
    test('rejects a stale Bearer token on this otherwise public endpoint', async () => {
      const response = await test.step('Sign in with a stale Bearer token', () =>
        authClient.signIn(apiConfig.validLoginCredentials, {
          Authorization: 'Bearer expired-or-invalid-token',
        }),
      );

      await test.step('Verify the 401 JSON response cannot be cached', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNoStoreResponse(response);
      });

      await test.step('Verify the authentication error message', async () => {
        const body = (await response.json()) as ApiErrorResponse;
        expectNonEmptyString(body.message);
      });
    });
  });

  test.describe('422', () => {
    test('rejects well-formed credentials that do not authenticate', async () => {
      const response = await test.step('Sign in with an incorrect password', () =>
        authClient.signIn({
          username: apiConfig.validLoginCredentials.username,
          password: 'definitely-not-the-correct-password',
        }),
      );

      await test.step('Verify the 422 JSON response cannot be cached', async () => {
        expect(response.status()).toBe(422);
        expectJsonResponse(response);
        expectNoStoreResponse(response);
      });

      await test.step('Verify the invalid credentials error message', async () => {
        const body = (await response.json()) as ApiErrorResponse;
        expectNonEmptyString(body.message);
      });
    });

    test('rejects an empty credentials object', async () => {
      const response = await test.step('Sign in without credentials', () => authClient.signIn({}));

      await test.step('Verify the 422 JSON response cannot be cached', async () => {
        expect(response.status()).toBe(422);
        expectJsonResponse(response);
        expectNoStoreResponse(response);
      });

      await test.step('Verify the missing credentials error message', async () => {
        const body = (await response.json()) as ApiErrorResponse;
        expectNonEmptyString(body.message);
      });
    });
  });
});
