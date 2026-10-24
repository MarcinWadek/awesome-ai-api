import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { InventoryItem, Movement, Order, Page } from '../../../types/commerce';
test.describe('POST /api/v1/orders/{id}/cancel', () => {
  for (const [status, actor] of [['PENDING', 'owner'], ['PAID', 'administrator']] as const) {
    test(`200: ${actor} cancels a ${status} order and restores deducted stock`, async ({ commerce, authenticatedAdmin }) => {
      // Given
      const product = await commerce.product();
      const order = await commerce.checkout(product);
      if (status === 'PAID') expect((await commerce.orders.updateStatus(order.id, status, authenticatedAdmin.token)).status()).toBe(200);
      expect(await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 5 });

      // When
      const response = await commerce.orders.cancel(order.id, actor === 'owner' ? commerce.shopper.token : authenticatedAdmin.token);

      // Then
      expect(await json<Order>(response)).toMatchObject({ id: order.id, status: 'CANCELLED', totalAmount: 24.68 });
      expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe('CANCELLED');
      expect(await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 7 });
      const ledger = await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token));
      expect(ledger.totalElements).toBe(3);
      expect(ledger.content[0]).toMatchObject({
        type: 'ORDER_RESTORED',
        orderId: order.id,
        productId: product.id,
        delta: 2,
        quantityAfter: 7,
        actor: commerce.shopper.username
      });

      // When
      const repeated = await commerce.orders.cancel(order.id, commerce.shopper.token);

      // Then
      expect(await json(repeated, 400)).toEqual({ message: 'Order cannot be cancelled in current status' });
      expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
      expect((await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(3);
      expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe('CANCELLED');
    });
  }

  test('400: rejects cancellation of a SHIPPED order', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    const order = await commerce.checkout(product);
    expect((await commerce.orders.updateStatus(order.id, 'SHIPPED', authenticatedAdmin.token)).status()).toBe(200);

    // When
    const response = await commerce.orders.cancel(order.id, commerce.shopper.token);

    // Then
    expect(await json(response, 400)).toEqual({ message: 'Order cannot be cancelled in current status' });
    expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe('SHIPPED');
    expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(5);
    expect((await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(2);
  });

  test('401: rejects anonymous cancellation and preserves the order', async ({ commerce }) => {
    // Given
    const order = await commerce.checkout(await commerce.product());

    // When
    const response = await commerce.orders.cancel(order.id);

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe('PENDING');
  });

  test('403: rejects cancellation by another customer', async ({ commerce, authenticatedPeer, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    const order = await commerce.checkout(product);

    // When
    const response = await commerce.orders.cancel(order.id, authenticatedPeer.token);

    // Then
    expect(await json(response, 403)).toEqual({ message: "You cannot cancel someone else's order" });
    expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe('PENDING');
    expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(5);
  });
});
