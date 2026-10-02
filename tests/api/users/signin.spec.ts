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
      const response = await authClient.signIn(apiConfig.validLoginCredentials);

      expect(response.status()).toBe(200);
      expectJsonResponse(response);
      expectNoStoreResponse(response);

      const body = (await response.json()) as LoginResponse;
      expectNonEmptyString(body.token);
      expect(body.username).toBe(apiConfig.validLoginCredentials.username);
      expectNonEmptyString(body.email);
    });
  });

  test.describe('401', () => {
    test('rejects a stale Bearer token on this otherwise public endpoint', async () => {
      const response = await authClient.signIn(apiConfig.validLoginCredentials, {
        Authorization: 'Bearer expired-or-invalid-token',
      });

      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expectNoStoreResponse(response);

      const body = (await response.json()) as ApiErrorResponse;
      expectNonEmptyString(body.message);
    });
  });

  test.describe('422', () => {
    test('rejects well-formed credentials that do not authenticate', async () => {
      const response = await authClient.signIn({
        username: apiConfig.validLoginCredentials.username,
        password: 'definitely-not-the-correct-password',
      });

      expect(response.status()).toBe(422);
      expectJsonResponse(response);
      expectNoStoreResponse(response);

      const body = (await response.json()) as ApiErrorResponse;
      expectNonEmptyString(body.message);
    });

    test('rejects an empty credentials object', async () => {
      const response = await authClient.signIn({});

      expect(response.status()).toBe(422);
      expectJsonResponse(response);
      expectNoStoreResponse(response);

      const body = (await response.json()) as ApiErrorResponse;
      expectNonEmptyString(body.message);
    });
  });
});
