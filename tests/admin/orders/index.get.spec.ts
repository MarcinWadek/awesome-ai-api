import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { Order, Page } from '../../../types/commerce';
test.describe('GET /api/v1/orders', () => {
  test('200: lists only the customer orders with status filtering and pagination', async ({ commerce, authenticatedPeer, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    const pending = await commerce.checkout(product, 1);
    const paid = await commerce.checkout(product, 1);
    expect((await commerce.orders.updateStatus(paid.id, 'PAID', authenticatedAdmin.token)).status()).toBe(200);

    // When
    const response = await commerce.orders.list(commerce.shopper.token, { page: 0, size: 1 });

    // Then
    const first = await json<Page<Order>>(response);
    const second = await json<Page<Order>>(await commerce.orders.list(commerce.shopper.token, { page: 1, size: 1 }));
    expect(first).toMatchObject({ pageNumber: 0, pageSize: 1, totalElements: 2, totalPages: 2 });
    expect(second).toMatchObject({ pageNumber: 1, pageSize: 1, totalElements: 2, totalPages: 2 });
    expect([...first.content, ...second.content].map(o => o.id).sort()).toEqual([pending.id, paid.id].sort());
    expect([...first.content, ...second.content].every(o => o.username === commerce.shopper.username)).toBe(true);
    const filtered = await json<Page<Order>>(await commerce.orders.list(commerce.shopper.token, { status: 'PAID' }));
    expect(filtered.totalElements).toBe(1);
    expect(filtered.content).toEqual([expect.objectContaining({ id: paid.id, status: 'PAID', username: commerce.shopper.username })]);
    expect(await json<Page<Order>>(await commerce.orders.list(authenticatedPeer.token))).toMatchObject({
      content: [],
      totalElements: 0,
      totalPages: 0
    });
    expect((await json<Page<Order>>(await commerce.orders.list(commerce.shopper.token, { page: 2, size: 1 }))).content).toEqual([]);
  });

  test('401: requires authentication', async ({ commerce }) => {
    // When
    const response = await commerce.orders.list();

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
  });
});
