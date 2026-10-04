import { expect, type APIResponse } from '@playwright/test';

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
