import { expect, type APIResponse } from '@playwright/test';

// Status and content type are checked before a response is treated as a DTO.
export async function json<T>(response: APIResponse, status = 200): Promise<T> {
  expect(response.status()).toBe(status);
  expectJsonResponse(response);
  return await response.json() as T;
}

export function expectJsonResponse(response: APIResponse): void {
  expect(response.headers()['content-type']).toContain('application/json');
}

export function expectNoStoreResponse(response: APIResponse): void {
  expect(response.headers()['cache-control']).toContain('no-store');
}

export function expectNonEmptyString(value: unknown): asserts value is string {
  expect(value).toEqual(expect.any(String));
  expect((value as string).trim()).not.toBe('');
}
