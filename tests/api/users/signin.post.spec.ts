import { expect, test } from '../../../fixtures/clients.fixture';
import { expectJsonResponse, expectNoStoreResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { apiConfig } from '../../../support/config';
import type { ApiErrorResponse, LoginResponse } from '../../../types/auth';
test.describe('POST /api/v1/users/signin', () => {
  test('200: returns a usable session token and the authenticated user identity', async ({ authClient }) => {
    // When
    const response = await authClient.signIn(apiConfig.validLoginCredentials);

    // Then
    expect(response.status()).toBe(200);
    expectJsonResponse(response);
    expectNoStoreResponse(response);
    const body = (await response.json()) as LoginResponse;
    expectNonEmptyString(body.token);
    expect(body.username).toBe(apiConfig.validLoginCredentials.username);
    expectNonEmptyString(body.email);
  });

  test('401: rejects a stale Bearer token on this otherwise public endpoint', async ({ authClient }) => {
    // When
    const response = await authClient.signIn(apiConfig.validLoginCredentials, { Authorization: 'Bearer expired-or-invalid-token' });

    // Then
    expect(response.status()).toBe(401);
    expectJsonResponse(response);
    expectNoStoreResponse(response);
    const body = (await response.json()) as ApiErrorResponse;
    expectNonEmptyString(body.message);
  });

  test('422: rejects well-formed credentials that do not authenticate', async ({ authClient }) => {
    // When
    const response = await authClient.signIn({
      username: apiConfig.validLoginCredentials.username,
      password: 'definitely-not-the-correct-password'
    });

    // Then
    expect(response.status()).toBe(422);
    expectJsonResponse(response);
    expectNoStoreResponse(response);
    const body = (await response.json()) as ApiErrorResponse;
    expectNonEmptyString(body.message);
  });

  test('422: rejects an empty credentials object', async ({ authClient }) => {
    // When
    const response = await authClient.signIn({});

    // Then
    expect(response.status()).toBe(422);
    expectJsonResponse(response);
    expectNoStoreResponse(response);
    const body = (await response.json()) as ApiErrorResponse;
    expectNonEmptyString(body.message);
  });
});
