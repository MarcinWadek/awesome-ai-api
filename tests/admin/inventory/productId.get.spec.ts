import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { InventoryItem } from '../../../types/commerce';
test.describe('GET /api/v1/admin/inventory/{productId}', () => {
  test('200: returns exact product inventory and applies the requested threshold', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();

    // When
    const response = await commerce.inventory.get(product.id, authenticatedAdmin.token, 7);

    // Then
    const body = await json<InventoryItem>(response);
    expect(body).toEqual({
      productId: product.id,
      name: product.name,
      category: product.category,
      availableQuantity: 7,
      stockStatus: 'LOW_STOCK',
      lastChangedAt: product.updatedAt
    });
    expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).stockStatus).toBe('IN_STOCK');
  });

  test('404: rejects a missing product', async ({ commerce, authenticatedAdmin }) => {
    // When
    const response = await commerce.inventory.get(0, authenticatedAdmin.token);

    // Then
    expect(await json(response, 404)).toEqual({ message: 'Product not found' });
  });
});
