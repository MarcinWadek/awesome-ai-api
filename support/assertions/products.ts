import { expect } from '@playwright/test';
import type { ProductResponse } from '../../types/products';
import { expectNonEmptyString } from './http';

export function expectProduct(body: ProductResponse): void {
  expect(Number.isInteger(body.id)).toBe(true);
  expect(body.id).toBeGreaterThan(0);
  expectNonEmptyString(body.name);
  expect(body.description).toEqual(expect.any(String));
  expect(body.category).toEqual(expect.any(String));
  expect(Number.isFinite(body.price)).toBe(true);
  expect(body.price).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(body.stockQuantity)).toBe(true);
  expect(body.stockQuantity).toBeGreaterThanOrEqual(0);
  if (body.imageUrl !== null) {
    expect(body.imageUrl).toEqual(expect.any(String));
  }
  // DTO dates are server-local values; do not interpret them as UTC instants.
  for (const timestamp of [body.createdAt, body.updatedAt]) {
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?$/);
  }
}
