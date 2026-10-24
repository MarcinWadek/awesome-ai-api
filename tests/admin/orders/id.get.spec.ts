import { test, expect, json, shippingAddress } from '../../../fixtures/commerce.fixture';
import { expectOrder } from '../../../support/assertions/commerce';
import type { Order } from '../../../types/commerce';
test.describe('GET /api/v1/orders/{id}', () => {
  test('200: administrator retrieves a customer order with exact details', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    const order = await commerce.checkout(product);

    // When
    const response = await commerce.orders.get(order.id, authenticatedAdmin.token);

    // Then
    const body = await json<Order>(response);
    expect(body.id).toBe(order.id);
    expectOrder(body, commerce.shopper.username, [{ product, quantity: 2 }], shippingAddress);
  });

  test('401: requires authentication for an existing order', async ({ commerce }) => {
    // Given
    const order = await commerce.checkout(await commerce.product());

    // When
    const response = await commerce.orders.get(order.id);

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
  });

  test('404: hides another customer order', async ({ commerce, authenticatedPeer }) => {
    // Given
    const order = await commerce.checkout(await commerce.product());

    // When
    const response = await commerce.orders.get(order.id, authenticatedPeer.token);

    // Then
    expect(await json(response, 404)).toEqual({ message: 'Order not found' });
    expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe('PENDING');
  });

  test('404: rejects an absent order', async ({ commerce }) => {
    // When
    const response = await commerce.orders.get(0, commerce.shopper.token);

    // Then
    expect(await json(response, 404)).toEqual({ message: 'Order not found' });
  });
});
