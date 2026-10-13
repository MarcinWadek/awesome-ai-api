import { randomUUID } from 'node:crypto';
import { ProductsClient } from '../../../clients/products.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';

test.describe('DELETE /api/v1/products/{id}', () => {
  let productsClient: ProductsClient;
  let data: ProductCreateRequest;

  test.beforeEach(({ request }) => {
    productsClient = new ProductsClient(request);
    data = {
      name: `api-test-${randomUUID()}`,
      description: 'Disposable API test product',
      price: 12.34,
      stockQuantity: 7,
      category: 'API tests',
      imageUrl: null,
    };
  });

  test.afterEach(async ({ authenticatedAdmin }) => {
    await test.step('Then remove products with this test\'s unique name', async () => {
      const response = await productsClient.getProducts(authenticatedAdmin.token);
      expect(response.status()).toBe(200);
      const products = await response.json() as ProductResponse[];
      for (const product of products.filter(product => product.name === data.name)) {
        const cleanup = await productsClient.deleteProduct(product.id, authenticatedAdmin.token);
        expect([204, 404]).toContain(cleanup.status());
      }
    });
  });

  test('204: deletes a disposable product', async ({ authenticatedAdmin }) => {
    const product = await test.step('Given a unique product owned by this test', async () => {
      const response = await productsClient.createProduct(data, authenticatedAdmin.token);
      expect(response.status()).toBe(201);
      return await response.json() as ProductResponse;
    });
    const response = await test.step('When the admin deletes that product', () =>
      productsClient.deleteProduct(product.id, authenticatedAdmin.token),
    );
    await test.step('Then deletion returns an empty response and the product is absent', async () => {
      expect(response.status()).toBe(204);
      expect(await response.text()).toBe('');
      const read = await productsClient.getProduct(product.id, authenticatedAdmin.token);
      expect(read.status()).toBe(404);
    });
  });
});
