import { randomUUID } from 'node:crypto';
import { test, expect, json, shippingAddress } from '../../../fixtures/commerce.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import { expectOrder } from '../../../support/assertions/commerce';
import type { InventoryItem, Movement, Order, Page } from '../../../types/commerce';
import type { CartResponse } from '../../../types/cart';
test.describe('POST /api/v1/orders', () => {
  test('201: persists multi-item checkout, clears only the owner cart and deducts stock', async ({ commerce, authenticatedAdmin, authenticatedPeer }) => {
    // Given
    const first = await commerce.product();
    const second = await commerce.product({ price: 5 });
    const catalogue = await json<{ id: number }[]>(await commerce.products.getProducts(commerce.shopper.token));
    expect(catalogue.map(p => p.id)).toEqual(expect.arrayContaining([first.id, second.id]));
    expect((await commerce.cart.addItem({ productId: first.id, quantity: 2 }, commerce.shopper.token)).status()).toBe(200);
    expect((await commerce.cart.addItem({ productId: second.id, quantity: 1 }, commerce.shopper.token)).status()).toBe(200);
    expect((await commerce.cart.addItem({ productId: second.id, quantity: 2 }, authenticatedPeer.token)).status()).toBe(200);
    expectCart(await json<CartResponse>(await commerce.cart.getCart(commerce.shopper.token)), commerce.shopper.username, [{ productId: first.id, quantity: 2 }, { productId: second.id, quantity: 1 }], 29.68);

    // When
    const response = await commerce.orders.create(shippingAddress, commerce.shopper.token);

    // Then
    const order = await json<Order>(response, 201);
    expectOrder(order, commerce.shopper.username, [{ product: first, quantity: 2 }, { product: second, quantity: 1 }], shippingAddress);
    expectOrder(await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token)), commerce.shopper.username, [{ product: first, quantity: 2 }, { product: second, quantity: 1 }], shippingAddress);
    expectEmptyCart(await json<CartResponse>(await commerce.cart.getCart(commerce.shopper.token)), commerce.shopper.username);
    expectCart(await json<CartResponse>(await commerce.cart.getCart(authenticatedPeer.token)), authenticatedPeer.user.username, [{ productId: second.id, quantity: 2 }], 10);

    for (const [product, quantity] of [[first, 2], [second, 1]] as const) {
      expect(await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 7 - quantity });
      const movements = await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token));
      expect(movements.totalElements).toBe(2);
      expect(movements.content[0]).toMatchObject({
        productId: product.id,
        orderId: order.id,
        type: 'ORDER_DEDUCTED',
        delta: -quantity,
        quantityAfter: 7 - quantity,
        actor: commerce.shopper.username
      });
    }
  });

  test('400: rejects checkout from an empty cart without creating an order', async ({ commerce }) => {
    // When
    const response = await commerce.orders.create(shippingAddress, commerce.shopper.token);

    // Then
    expect(await json(response, 400)).toEqual({ message: 'Cart is empty' });
    expect(await json<Page<Order>>(await commerce.orders.list(commerce.shopper.token))).toMatchObject({
      content: [],
      totalElements: 0
    });
  });

  test('400: rejects invalid address and preserves cart and stock', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    expect((await commerce.cart.addItem({ productId: product.id, quantity: 2 }, commerce.shopper.token)).status()).toBe(200);

    // When
    const response = await commerce.orders.create({
      ...shippingAddress,
      street: ''
    }, commerce.shopper.token);

    // Then
    expect(await json(response, 400)).toEqual({ street: 'Street is required' });
    expectCart(await json<CartResponse>(await commerce.cart.getCart(commerce.shopper.token)), commerce.shopper.username, [{ productId: product.id, quantity: 2 }], 24.68);
    expect(await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 7 });
    expect(await json<Page<Order>>(await commerce.orders.list(commerce.shopper.token))).toMatchObject({
      content: [],
      totalElements: 0
    });
  });

  test('401: rejects anonymous checkout without affecting an authenticated cart', async ({ commerce }) => {
    // Given
    const product = await commerce.product();
    expect((await commerce.cart.addItem({ productId: product.id, quantity: 1 }, commerce.shopper.token)).status()).toBe(200);

    // When
    const response = await commerce.orders.create(shippingAddress);

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    expectCart(await json<CartResponse>(await commerce.cart.getCart(commerce.shopper.token)), commerce.shopper.username, [{ productId: product.id, quantity: 1 }], 12.34);
    expect((await json<Page<Order>>(await commerce.orders.list(commerce.shopper.token))).totalElements).toBe(0);
  });

  test('409: rolls back the entire checkout when one cart product loses stock', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const available = await commerce.product();
    const short = await commerce.product({ price: 5 });

    for (const product of [available, short]) expect((await commerce.cart.addItem({ productId: product.id, quantity: 2 }, commerce.shopper.token)).status()).toBe(200);
    expect((await commerce.inventory.adjust(short.id, { delta: -6, reason: 'Controlled checkout shortage', requestId: randomUUID() }, authenticatedAdmin.token)).status()).toBe(201);

    // When
    const response = await commerce.orders.create(shippingAddress, commerce.shopper.token);

    // Then
    expect(await json(response, 409)).toEqual({ message: `Insufficient stock for product ${short.id}` });
    expectCart(await json<CartResponse>(await commerce.cart.getCart(commerce.shopper.token)), commerce.shopper.username, [{ productId: available.id, quantity: 2 }, { productId: short.id, quantity: 2 }], 34.68);
    expect((await json<Page<Order>>(await commerce.orders.list(commerce.shopper.token))).totalElements).toBe(0);

    for (const product of [available, short]) {
      expect(await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: product === short ? 1 : 7 });
      const movements = await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token));
      expect(movements.content.some(m => m.type === 'ORDER_DEDUCTED')).toBe(false);
    }
  });
});
