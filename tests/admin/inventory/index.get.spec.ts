import { randomUUID } from 'node:crypto';
import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { InventoryItem, Page } from '../../../types/commerce';
test.describe('GET /api/v1/admin/inventory', () => {
  test('200: filters owned products by stock classification and catalogue fields with pagination', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const category = `Commerce ${randomUUID()}`;
    const empty = await commerce.product({ category, stockQuantity: 0 });
    const low = await commerce.product({ category, stockQuantity: 5 });
    const stocked = await commerce.product({ category, stockQuantity: 6 });

    // When
    const response = await commerce.inventory.list(authenticatedAdmin.token, { category: category.toLowerCase(), page: 0, size: 1 });

    // Then
    const first = await json<Page<InventoryItem>>(response);
    expect(first).toMatchObject({ pageNumber: 0, pageSize: 1, totalElements: 3, totalPages: 3 });
    expect(first.content.map(i => i.productId)).toEqual([empty.id]);
    const second = await json<Page<InventoryItem>>(await commerce.inventory.list(authenticatedAdmin.token, { category, page: 1, size: 1 }));
    expect(second.content.map(i => i.productId)).toEqual([low.id]);

    for (const [product, status] of [[empty, 'OUT_OF_STOCK'], [low, 'LOW_STOCK'], [stocked, 'IN_STOCK']] as const) {
      const page = await json<Page<InventoryItem>>(await commerce.inventory.list(authenticatedAdmin.token, { category, status, lowStockThreshold: 5 }));
      expect(page.totalElements).toBe(1);
      expect(page.content).toEqual([expect.objectContaining({ productId: product.id, availableQuantity: product.stockQuantity, stockStatus: status })]);
    }
    const search = await json<Page<InventoryItem>>(await commerce.inventory.list(authenticatedAdmin.token, { search: stocked.name.toUpperCase(), page: -1, size: 101 }));
    expect(search).toMatchObject({ pageNumber: 0, pageSize: 100, totalElements: 1 });
    expect(search.content[0]).toMatchObject({ productId: stocked.id, name: stocked.name, category });
    const last = await json<Page<InventoryItem>>(await commerce.inventory.list(authenticatedAdmin.token, { category, page: 2, size: 1 }));
    expect(last.content.map(i => i.productId)).toEqual([stocked.id]);
  });

  test('401: requires authentication', async ({ commerce }) => {
    // When
    const response = await commerce.inventory.list();

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
  });

  test('403: rejects ordinary customers', async ({ commerce }) => {
    // When
    const response = await commerce.inventory.list(commerce.shopper.token);

    // Then
    expect(await json(response, 403)).toEqual({ message: 'Access denied' });
  });
});
