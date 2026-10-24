import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { InventoryItem, Movement, Order, Page } from '../../../types/commerce';
test.describe('PUT /api/v1/orders/{id}/status', () => {
  test('200: persists direct non-cancellation statuses without changing inventory', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    const order = await commerce.checkout(product);

    for (const status of ['PAID', 'SHIPPED', 'DELIVERED', 'PENDING'] as const) {
      // When
      const response = await commerce.orders.updateStatus(order.id, status, authenticatedAdmin.token);

      // Then
      expect(await json<Order>(response)).toMatchObject({ id: order.id, status, totalAmount: 24.68 });
      expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe(status);
      expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(5);
      expect((await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(2);
    }
  });

  test('200: cancellation status restores stock only once even after reopening', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    const order = await commerce.checkout(product);
    expect((await commerce.orders.updateStatus(order.id, 'PAID', authenticatedAdmin.token)).status()).toBe(200);

    for (const iteration of [1, 2]) {
      if (iteration === 2) {
        // Given
        expect((await commerce.orders.updateStatus(order.id, 'PENDING', authenticatedAdmin.token)).status()).toBe(200);
      }

      // When
      const response = await commerce.orders.updateStatus(order.id, 'CANCELLED', authenticatedAdmin.token);

      // Then
      expect(await json<Order>(response)).toMatchObject({ id: order.id, status: 'CANCELLED' });
      expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe('CANCELLED');
      expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
      const ledger = await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token));
      expect(ledger.totalElements).toBe(3);
      expect(ledger.content.filter(m => m.type === 'ORDER_RESTORED')).toHaveLength(1);
    }
  });

  test('400: rejects CANCELLED transition from SHIPPED', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    const order = await commerce.checkout(product);
    expect((await commerce.orders.updateStatus(order.id, 'SHIPPED', authenticatedAdmin.token)).status()).toBe(200);

    // When
    const response = await commerce.orders.updateStatus(order.id, 'CANCELLED', authenticatedAdmin.token);

    // Then
    expect(await json(response, 400)).toEqual({ message: 'Order cannot be cancelled in current status' });
    expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe('SHIPPED');
    expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(5);
    expect((await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(2);
  });

  test('403: rejects customer status changes even for an owned order', async ({ commerce }) => {
    // Given
    const order = await commerce.checkout(await commerce.product());

    // When
    const response = await commerce.orders.updateStatus(order.id, 'PAID', commerce.shopper.token);

    // Then
    expect(await json(response, 403)).toEqual({ message: 'Access denied' });
    expect((await json<Order>(await commerce.orders.get(order.id, commerce.shopper.token))).status).toBe('PENDING');
  });
});
