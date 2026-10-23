import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { Order, Page } from '../../../types/commerce';

test.describe('GET /api/v1/orders/admin', () => {
  test('200: includes owned orders across customers with status filtering and real pagination', async ({ commerce: c, authenticatedAdmin }) => {
    const order = await c.checkout(await c.product());
    await test.step('Given an owned order moved to PAID', async () => { expect((await c.orders.updateStatus(order.id, 'PAID', authenticatedAdmin.token)).status()).toBe(200); });
    const response = await test.step('When the administrator lists PAID orders one per page', () => c.orders.listAdmin(authenticatedAdmin.token, { status: 'PAID', size: 1 }));
    await test.step('Then pagination can find the owned row without assuming shared order counts', async () => {
      let page = await json<Page<Order>>(response);
      expect(page).toMatchObject({ pageNumber: 0, pageSize: 1 });
      expect(page.totalElements).toBeGreaterThanOrEqual(1);
      let found = false;
      // The owned row existed before paging. Never save or print unrelated rows.
      const pages = page.totalPages;
      for (let index = 0; index < pages; index++) {
        if (index > 0) page = await json<Page<Order>>(await c.orders.listAdmin(authenticatedAdmin.token, { status: 'PAID', page: index, size: 1 }));
        expect(page.pageNumber).toBe(index);
        expect(page.content.length).toBeLessThanOrEqual(1);
        expect(page.content.every(o => o.status === 'PAID')).toBe(true);
        const own = page.content.find(o => o.id === order.id);
        if (own) { expect(own).toMatchObject({ username: c.shopper.username, totalAmount: 24.68, status: 'PAID' }); found = true; break; }
      }
      expect(found, 'Administrator list must include the newly created shopper order').toBe(true);
      const pending = await json<Page<Order>>(await c.orders.listAdmin(authenticatedAdmin.token, { status: 'PENDING', size: 1 }));
      expect(pending.content.every(o => o.status === 'PENDING' && o.id !== order.id)).toBe(true);
    });
  });

  test('401: requires authentication', async ({ commerce: c }) => {
    const response = await test.step('When the administrator order list is read anonymously', () => c.orders.listAdmin());
    await test.step('Then authentication is required', async () => { expect(await json(response, 401)).toEqual({ message: 'Unauthorized' }); });
  });

  test('403: rejects ordinary customers', async ({ commerce: c }) => {
    const response = await test.step('When an ordinary shopper reads the administrator order list', () => c.orders.listAdmin(c.shopper.token));
    await test.step('Then the administrator role is required', async () => { expect(await json(response, 403)).toEqual({ message: 'Access denied' }); });
  });
});
