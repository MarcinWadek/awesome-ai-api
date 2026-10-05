import { expect, type APIResponse } from '@playwright/test';
import type { RefreshTokenResponse } from '../../types/auth';
import { expectJsonResponse, expectNoStoreResponse, expectNonEmptyString } from './http';

export async function expectRefreshedTokens(
  response: APIResponse,
  previousRefreshToken: string,
): Promise<RefreshTokenResponse> {
  expect(response.status()).toBe(200);
  expectJsonResponse(response);
  expectNoStoreResponse(response);
  const body = (await response.json()) as RefreshTokenResponse;
  expectNonEmptyString(body.token);
  expectNonEmptyString(body.refreshToken);
  // Compare without printing session credentials in a failing assertion.
  expect(body.refreshToken !== previousRefreshToken, 'Refresh token must rotate').toBe(true);
  return body;
}

export async function expectInvalidRefreshToken(response: APIResponse): Promise<void> {
  expect(response.status()).toBe(401);
  expectJsonResponse(response);
  expectNoStoreResponse(response);
  expect(await response.json()).toEqual({ message: 'Invalid refresh token' });
}
