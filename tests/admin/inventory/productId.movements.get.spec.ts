import { randomUUID } from 'node:crypto';
import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { Movement, Page } from '../../../types/commerce';

test.describe('GET /api/v1/admin/inventory/{productId}/movements', () => {
  test('200: returns only the owned product movements newest first with pagination', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const other = await c.product({ stockQuantity: 0 });
    const adjustment = { delta: 2, reason: 'Movement ordering', requestId: randomUUID() };
    const recorded = await test.step('Given an initial movement followed by an administrator adjustment', async () => json<Movement>(await c.inventory.adjust(product.id, adjustment, authenticatedAdmin.token), 201));
    const response = await test.step('When the administrator reads the newest movement page', () => c.inventory.movements(product.id, authenticatedAdmin.token, { size: 1 }));
    await test.step('Then pagination and ordering preserve exact product/adjustment correlation', async () => {
      const first = await json<Page<Movement>>(response);
      expect(first).toEqual({ content: [recorded], pageNumber: 0, pageSize: 1, totalElements: 2, totalPages: 2 });
      const second = await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token, { page: 1, size: 1 }));
      expect(second).toMatchObject({ pageNumber: 1, pageSize: 1, totalElements: 2, totalPages: 2 });
      expect(second.content).toEqual([expect.objectContaining({ productId: product.id, orderId: null, type: 'INITIAL_STOCK', delta: 7, quantityAfter: 7, requestId: null, reason: 'Initial stock' })]);
      expect(recorded.id).toBeGreaterThan(second.content[0].id);
      expect((await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token, { page: 2, size: 1 }))).content).toEqual([]);
      expect(await json<Page<Movement>>(await c.inventory.movements(other.id, authenticatedAdmin.token))).toMatchObject({ content: [], totalElements: 0 });
      const clamped = await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token, { page: -1, size: 101 }));
      expect(clamped).toMatchObject({ pageNumber: 0, pageSize: 100, totalElements: 2 });
      expect(clamped.content.map(m => m.id)).toEqual([recorded.id, second.content[0].id]);
    });
  });
});
