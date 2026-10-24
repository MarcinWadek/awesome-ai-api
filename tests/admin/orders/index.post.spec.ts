import { randomUUID } from 'node:crypto';
import { test, expect, json, shippingAddress } from '../../../fixtures/commerce.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import { expectOrder } from '../../../support/assertions/commerce';
import type { InventoryItem, Movement, Order, Page } from '../../../types/commerce';
import type { CartResponse } from '../../../types/cart';

test.describe('POST /api/v1/orders', () => {
  test('201: persists multi-item checkout, clears only the owner cart and deducts stock', async ({ commerce: c, authenticatedAdmin, authenticatedPeer }) => {
    const first = await c.product();
    const second = await c.product({ price: 5 });
    await test.step('Given two selected products in the shopper cart and a separate peer cart', async () => {
      const catalogue = await json<{ id: number }[]>(await c.products.getProducts(c.shopper.token));
      expect(catalogue.map(p => p.id)).toEqual(expect.arrayContaining([first.id, second.id]));
      expect((await c.cart.addItem({ productId: first.id, quantity: 2 }, c.shopper.token)).status()).toBe(200);
      expect((await c.cart.addItem({ productId: second.id, quantity: 1 }, c.shopper.token)).status()).toBe(200);
      expect((await c.cart.addItem({ productId: second.id, quantity: 2 }, authenticatedPeer.token)).status()).toBe(200);
      expectCart(await json<CartResponse>(await c.cart.getCart(c.shopper.token)), c.shopper.username,
        [{ productId: first.id, quantity: 2 }, { productId: second.id, quantity: 1 }], 29.68);
    });
    const response = await test.step('When the shopper checks out with a valid shipping address', () => c.orders.create(shippingAddress, c.shopper.token));
    await test.step('Then the exact order snapshot, cart clearing and inventory deductions persist', async () => {
      const order = await json<Order>(response, 201);
      expectOrder(order, c.shopper.username, [{ product: first, quantity: 2 }, { product: second, quantity: 1 }], shippingAddress);
      expectOrder(await json<Order>(await c.orders.get(order.id, c.shopper.token)), c.shopper.username,
        [{ product: first, quantity: 2 }, { product: second, quantity: 1 }], shippingAddress);
      expectEmptyCart(await json<CartResponse>(await c.cart.getCart(c.shopper.token)), c.shopper.username);
      expectCart(await json<CartResponse>(await c.cart.getCart(authenticatedPeer.token)), authenticatedPeer.user.username,
        [{ productId: second.id, quantity: 2 }], 10);
      for (const [product, quantity] of [[first, 2], [second, 1]] as const) {
        expect(await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 7 - quantity });
        const movements = await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token));
        expect(movements.totalElements).toBe(2);
        expect(movements.content[0]).toMatchObject({ productId: product.id, orderId: order.id, type: 'ORDER_DEDUCTED', delta: -quantity, quantityAfter: 7 - quantity, actor: c.shopper.username });
      }
    });
  });

  test('400: rejects checkout from an empty cart without creating an order', async ({ commerce: c }) => {
    const response = await test.step('When a new shopper checks out an empty cart', () => c.orders.create(shippingAddress, c.shopper.token));
    await test.step('Then the cart is empty error leaves no orders', async () => {
      expect(await json(response, 400)).toEqual({ message: 'Cart is empty' });
      expect(await json<Page<Order>>(await c.orders.list(c.shopper.token))).toMatchObject({ content: [], totalElements: 0 });
    });
  });

  test('400: rejects invalid address and preserves cart and stock', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    await test.step('Given a populated cart', async () => {
      expect((await c.cart.addItem({ productId: product.id, quantity: 2 }, c.shopper.token)).status()).toBe(200);
    });
    const response = await test.step('When checkout has a blank street', () => c.orders.create({ ...shippingAddress, street: '' }, c.shopper.token));
    await test.step('Then address validation rejects the order without side effects', async () => {
      expect(await json(response, 400)).toEqual({ street: 'Street is required' });
      expectCart(await json<CartResponse>(await c.cart.getCart(c.shopper.token)), c.shopper.username, [{ productId: product.id, quantity: 2 }], 24.68);
      expect(await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 7 });
      expect(await json<Page<Order>>(await c.orders.list(c.shopper.token))).toMatchObject({ content: [], totalElements: 0 });
    });
  });

  test('401: rejects anonymous checkout without affecting an authenticated cart', async ({ commerce: c }) => {
    const product = await c.product();
    await test.step('Given the shopper has a populated cart', async () => {
      expect((await c.cart.addItem({ productId: product.id, quantity: 1 }, c.shopper.token)).status()).toBe(200);
    });
    const response = await test.step('When checkout omits authentication', () => c.orders.create(shippingAddress));
    await test.step('Then authentication is required and the shopper cart remains intact', async () => {
      expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
      expectCart(await json<CartResponse>(await c.cart.getCart(c.shopper.token)), c.shopper.username, [{ productId: product.id, quantity: 1 }], 12.34);
      expect((await json<Page<Order>>(await c.orders.list(c.shopper.token))).totalElements).toBe(0);
    });
  });

  test('409: rolls back the entire checkout when one cart product loses stock', async ({ commerce: c, authenticatedAdmin }) => {
    const available = await c.product();
    const short = await c.product({ price: 5 });
    await test.step('Given both cart items were valid before one product stock fell below the cart quantity', async () => {
      for (const product of [available, short]) expect((await c.cart.addItem({ productId: product.id, quantity: 2 }, c.shopper.token)).status()).toBe(200);
      expect((await c.inventory.adjust(short.id, { delta: -6, reason: 'Controlled checkout shortage', requestId: randomUUID() }, authenticatedAdmin.token)).status()).toBe(201);
    });
    const response = await test.step('When the shopper checks out both products', () => c.orders.create(shippingAddress, c.shopper.token));
    await test.step('Then the conflict preserves the whole cart and creates no deduction or order', async () => {
      expect(await json(response, 409)).toEqual({ message: `Insufficient stock for product ${short.id}` });
      expectCart(await json<CartResponse>(await c.cart.getCart(c.shopper.token)), c.shopper.username,
        [{ productId: available.id, quantity: 2 }, { productId: short.id, quantity: 2 }], 34.68);
      expect((await json<Page<Order>>(await c.orders.list(c.shopper.token))).totalElements).toBe(0);
      for (const product of [available, short]) {
        expect(await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: product === short ? 1 : 7 });
        const movements = await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token));
        expect(movements.content.some(m => m.type === 'ORDER_DEDUCTED')).toBe(false);
      }
    });
  });
});
