import { expect } from '@playwright/test';
import type { CartClient } from '../../clients/cart.client';
import type { CartItem, CartResponse } from '../../types/cart';
import { json } from './http';

export async function expectPersistedCart(
  cart: CartClient, token: string, username: string, items: CartItem[], totalPrice: number,
): Promise<void> {
  const body = await json<CartResponse>(await cart.getCart(token));
  if (items.length === 0) {
    expectEmptyCart(body, username);
  } else {
    expectCart(body, username, items, totalPrice);
  }
}

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

