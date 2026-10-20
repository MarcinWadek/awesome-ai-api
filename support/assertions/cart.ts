import { expect } from '@playwright/test';
import type { CartItem, CartResponse } from '../../types/cart';

export function expectEmptyCart(body: CartResponse, username: string): void {
  expect(body).toEqual({ username, items: [], totalPrice: 0, totalItems: 0 });
}

export function expectCart(body: CartResponse, username: string, items: CartItem[], totalPrice: number): void {
  expect(body).toEqual({
    username,
    items: expect.arrayContaining(items),
    totalPrice,
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
  });
  expect(body.items).toHaveLength(items.length);
}

