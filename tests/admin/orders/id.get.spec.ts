import { test, expect, json, shippingAddress } from '../../../fixtures/commerce.fixture';
import { expectOrder } from '../../../support/assertions/commerce';
import type { Order } from '../../../types/commerce';

test.describe('GET /api/v1/orders/{id}', () => {
  test('200: administrator retrieves a customer order with exact details', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const order = await c.checkout(product);
    const response = await test.step('When the administrator reads the shopper order', () => c.orders.get(order.id, authenticatedAdmin.token));
    await test.step('Then all persisted order details match checkout', async () => {
      const body = await json<Order>(response);
      expect(body.id).toBe(order.id);
      expectOrder(body, c.shopper.username, [{ product, quantity: 2 }], shippingAddress);
    });
  });

  test('401: requires authentication for an existing order', async ({ commerce: c }) => {
    const order = await c.checkout(await c.product());
    const response = await test.step('When an anonymous caller reads the existing order', () => c.orders.get(order.id));
    await test.step('Then authentication is required', async () => { expect(await json(response, 401)).toEqual({ message: 'Unauthorized' }); });
  });

  test('404: hides another customer order', async ({ commerce: c, authenticatedPeer }) => {
    const order = await c.checkout(await c.product());
    const response = await test.step('When a peer customer reads the owner order', () => c.orders.get(order.id, authenticatedPeer.token));
    await test.step('Then the order is hidden while the owner can still retrieve it', async () => {
      expect(await json(response, 404)).toEqual({ message: 'Order not found' });
      expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe('PENDING');
    });
  });

  test('404: rejects an absent order', async ({ commerce: c }) => {
    const response = await test.step('When a customer reads order zero', () => c.orders.get(0, c.shopper.token));
    await test.step('Then the order is not found', async () => { expect(await json(response, 404)).toEqual({ message: 'Order not found' }); });
  });
});
