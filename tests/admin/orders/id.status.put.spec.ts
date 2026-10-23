import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { InventoryItem, Movement, Order, Page } from '../../../types/commerce';

test.describe('PUT /api/v1/orders/{id}/status', () => {
  test('200: persists direct non-cancellation statuses without changing inventory', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const order = await c.checkout(product);
    for (const status of ['PAID', 'SHIPPED', 'DELIVERED', 'PENDING'] as const) {
      const response = await test.step(`When the administrator sets ${status}`, () => c.orders.updateStatus(order.id, status, authenticatedAdmin.token));
      await test.step(`Then ${status} persists with unchanged deduction and monetary snapshot`, async () => {
        expect(await json<Order>(response)).toMatchObject({ id: order.id, status, totalAmount: 24.68 });
        expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe(status);
        expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(5);
        expect((await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(2);
      });
    }
  });

  test('200: cancellation status restores stock only once even after reopening', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const order = await c.checkout(product);
    await test.step('Given the administrator sets PAID', async () => { expect((await c.orders.updateStatus(order.id, 'PAID', authenticatedAdmin.token)).status()).toBe(200); });
    for (const iteration of [1, 2]) {
      if (iteration === 2) await test.step('Given the restored order is reopened without a new deduction', async () => { expect((await c.orders.updateStatus(order.id, 'PENDING', authenticatedAdmin.token)).status()).toBe(200); });
      const response = await test.step('When the administrator sets CANCELLED', () => c.orders.updateStatus(order.id, 'CANCELLED', authenticatedAdmin.token));
      await test.step('Then cancellation persists and the restored stock and ledger do not increase again', async () => {
        expect(await json<Order>(response)).toMatchObject({ id: order.id, status: 'CANCELLED' });
        expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe('CANCELLED');
        expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
        const ledger = await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token));
        expect(ledger.totalElements).toBe(3);
        expect(ledger.content.filter(m => m.type === 'ORDER_RESTORED')).toHaveLength(1);
      });
    }
  });

  test('400: rejects CANCELLED transition from SHIPPED', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const order = await c.checkout(product);
    await test.step('Given the order already has status SHIPPED', async () => { expect((await c.orders.updateStatus(order.id, 'SHIPPED', authenticatedAdmin.token)).status()).toBe(200); });
    const response = await test.step('When the administrator attempts CANCELLED', () => c.orders.updateStatus(order.id, 'CANCELLED', authenticatedAdmin.token));
    await test.step('Then the forbidden cancellation preserves persisted status and inventory', async () => {
      expect(await json(response, 400)).toEqual({ message: 'Order cannot be cancelled in current status' });
      expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe('SHIPPED');
      expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(5);
      expect((await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(2);
    });
  });

  test('403: rejects customer status changes even for an owned order', async ({ commerce: c }) => {
    const order = await c.checkout(await c.product());
    const response = await test.step('When the owner attempts to mark its order PAID', () => c.orders.updateStatus(order.id, 'PAID', c.shopper.token));
    await test.step('Then administrator privileges are required and status is unchanged', async () => {
      expect(await json(response, 403)).toEqual({ message: 'Access denied' });
      expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe('PENDING');
    });
  });
});
