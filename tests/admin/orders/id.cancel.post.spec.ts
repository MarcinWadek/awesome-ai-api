import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { InventoryItem, Movement, Order, Page } from '../../../types/commerce';

test.describe('POST /api/v1/orders/{id}/cancel', () => {
  for (const [status, actor] of [['PENDING', 'owner'], ['PAID', 'administrator']] as const) {
    test(`200: ${actor} cancels a ${status} order and restores deducted stock`, async ({ commerce: c, authenticatedAdmin }) => {
      const product = await c.product();
      const order = await c.checkout(product);
      await test.step(`Given an owned ${status} order with stock deducted`, async () => {
        if (status === 'PAID') expect((await c.orders.updateStatus(order.id, status, authenticatedAdmin.token)).status()).toBe(200);
        expect(await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 5 });
      });
      const response = await test.step(`When the ${actor} cancels it`, () => c.orders.cancel(order.id, actor === 'owner' ? c.shopper.token : authenticatedAdmin.token));
      await test.step('Then cancellation, restored stock and a single correlated movement persist', async () => {
        expect(await json<Order>(response)).toMatchObject({ id: order.id, status: 'CANCELLED', totalAmount: 24.68 });
        expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe('CANCELLED');
        expect(await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 7 });
        const ledger = await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token));
        expect(ledger.totalElements).toBe(3);
        expect(ledger.content[0]).toMatchObject({ type: 'ORDER_RESTORED', orderId: order.id, productId: product.id, delta: 2, quantityAfter: 7, actor: c.shopper.username });
      });
      const repeated = await test.step('When the owner repeats cancellation of the restored order', () => c.orders.cancel(order.id, c.shopper.token));
      await test.step('Then repeated cancellation cannot restore stock or add another movement', async () => {
        expect(await json(repeated, 400)).toEqual({ message: 'Order cannot be cancelled in current status' });
        expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
        expect((await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(3);
        expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe('CANCELLED');
      });
    });
  }

  test('400: rejects cancellation of a SHIPPED order', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const order = await c.checkout(product);
    await test.step('Given the order is SHIPPED', async () => { expect((await c.orders.updateStatus(order.id, 'SHIPPED', authenticatedAdmin.token)).status()).toBe(200); });
    const response = await test.step('When the owner cancels the order', () => c.orders.cancel(order.id, c.shopper.token));
    await test.step('Then the status and deducted inventory are preserved', async () => {
      expect(await json(response, 400)).toEqual({ message: 'Order cannot be cancelled in current status' });
      expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe('SHIPPED');
      expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(5);
      expect((await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(2);
    });
  });

  test('401: rejects anonymous cancellation and preserves the order', async ({ commerce: c }) => {
    const order = await c.checkout(await c.product());
    const response = await test.step('When an anonymous caller cancels an existing order', () => c.orders.cancel(order.id));
    await test.step('Then authentication is required and the order remains pending', async () => {
      expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
      expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe('PENDING');
    });
  });

  test('403: rejects cancellation by another customer', async ({ commerce: c, authenticatedPeer, authenticatedAdmin }) => {
    const product = await c.product();
    const order = await c.checkout(product);
    const response = await test.step('When a peer customer cancels the owner order', () => c.orders.cancel(order.id, authenticatedPeer.token));
    await test.step('Then ownership rejection preserves the status and stock deduction', async () => {
      expect(await json(response, 403)).toEqual({ message: "You cannot cancel someone else's order" });
      expect((await json<Order>(await c.orders.get(order.id, c.shopper.token))).status).toBe('PENDING');
      expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(5);
    });
  });
});
