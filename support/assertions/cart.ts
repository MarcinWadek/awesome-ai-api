import { expect } from '@playwright/test';
import type { CartResponse } from '../../types/cart';

export function expectEmptyCart(body: CartResponse, username: string): void {
  expect(body).toEqual({ username, items: [], totalPrice: 0, totalItems: 0 });
}

