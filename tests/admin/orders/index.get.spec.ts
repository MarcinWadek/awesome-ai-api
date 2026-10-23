import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { Order, Page } from '../../../types/commerce';

test.describe('GET /api/v1/orders', () => {
  test('200: lists only the customer orders with status filtering and pagination', async ({ commerce: c, authenticatedPeer, authenticatedAdmin }) => {
    const product = await c.product();
    const pending = await c.checkout(product, 1);
    const paid = await c.checkout(product, 1);
    await test.step('Given one PENDING and one PAID owned order', async () => {
      expect((await c.orders.updateStatus(paid.id, 'PAID', authenticatedAdmin.token)).status()).toBe(200);
    });
    const response = await test.step('When the shopper lists its orders one per page', () => c.orders.list(c.shopper.token, { page: 0, size: 1 }));
    await test.step('Then both pages contain only owned orders and filters isolate the requested status', async () => {
      const first = await json<Page<Order>>(response);
      const second = await json<Page<Order>>(await c.orders.list(c.shopper.token, { page: 1, size: 1 }));
      expect(first).toMatchObject({ pageNumber: 0, pageSize: 1, totalElements: 2, totalPages: 2 });
      expect(second).toMatchObject({ pageNumber: 1, pageSize: 1, totalElements: 2, totalPages: 2 });
      expect([...first.content, ...second.content].map(o => o.id).sort()).toEqual([pending.id, paid.id].sort());
      expect([...first.content, ...second.content].every(o => o.username === c.shopper.username)).toBe(true);
      const filtered = await json<Page<Order>>(await c.orders.list(c.shopper.token, { status: 'PAID' }));
      expect(filtered.totalElements).toBe(1);
      expect(filtered.content).toEqual([expect.objectContaining({ id: paid.id, status: 'PAID', username: c.shopper.username })]);
      expect(await json<Page<Order>>(await c.orders.list(authenticatedPeer.token))).toMatchObject({ content: [], totalElements: 0, totalPages: 0 });
      expect((await json<Page<Order>>(await c.orders.list(c.shopper.token, { page: 2, size: 1 }))).content).toEqual([]);
    });
  });

  test('401: requires authentication', async ({ commerce: c }) => {
    const response = await test.step('When the order list is read anonymously', () => c.orders.list());
    await test.step('Then authentication is required', async () => { expect(await json(response, 401)).toEqual({ message: 'Unauthorized' }); });
  });
});
