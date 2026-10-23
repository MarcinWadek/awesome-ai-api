import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { InventoryItem } from '../../../types/commerce';

test.describe('GET /api/v1/admin/inventory/{productId}', () => {
  test('200: returns exact product inventory and applies the requested threshold', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const response = await test.step('When the administrator reads the owned product with threshold seven', () => c.inventory.get(product.id, authenticatedAdmin.token, 7));
    await test.step('Then identity, persisted quantity and inclusive classification match', async () => {
      const body = await json<InventoryItem>(response);
      expect(body).toEqual({ productId: product.id, name: product.name, category: product.category, availableQuantity: 7, stockStatus: 'LOW_STOCK', lastChangedAt: product.updatedAt });
      expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).stockStatus).toBe('IN_STOCK');
    });
  });

  test('404: rejects a missing product', async ({ commerce: c, authenticatedAdmin }) => {
    const response = await test.step('When the administrator reads inventory for product zero', () => c.inventory.get(0, authenticatedAdmin.token));
    await test.step('Then the product is not found', async () => { expect(await json(response, 404)).toEqual({ message: 'Product not found' }); });
  });
});
