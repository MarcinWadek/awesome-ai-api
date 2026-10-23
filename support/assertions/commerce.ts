import { expect } from '@playwright/test';
import type { Address, Order, OrderStatus } from '../../types/commerce';
import type { ProductResponse } from '../../types/products';

export function expectOrder(
  order: Order, username: string, items: { product: ProductResponse; quantity: number }[],
  address: Address, status: OrderStatus = 'PENDING',
): void {
  expect(order.id).toBeGreaterThan(0);
  expect(order).toMatchObject({ username, status, shippingAddress: address });
  expect(order.items).toHaveLength(items.length);
  let totalCents = 0;
  for (const { product, quantity } of items) {
    const cents = Math.round(product.price * 100) * quantity;
    totalCents += cents;
    expect(order.items).toEqual(expect.arrayContaining([expect.objectContaining({
      productId: product.id, productName: product.name, quantity, unitPrice: product.price, totalPrice: cents / 100,
    })]));
  }
  expect(order.totalAmount).toBe(totalCents / 100);
  expect(order.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(order.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
}
