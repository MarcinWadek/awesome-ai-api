import { randomUUID } from 'node:crypto';
import { ProductsClient } from '../../../clients/products.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectJsonResponse } from '../../../support/assertions/http';
import { expectProduct } from '../../../support/assertions/products';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';

test.describe('PUT /api/v1/products/{id}', () => {
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

  test('200: persists a partial update without changing omitted fields', async ({ authenticatedAdmin }) => {
    const product = await test.step('Given a unique product owned by this test', async () => {
      const response = await productsClient.createProduct(data, authenticatedAdmin.token);
      expect(response.status()).toBe(201);
      return await response.json() as ProductResponse;
    });
    const patch = { price: 23.45, stockQuantity: 9 };
    const response = await test.step('When the admin updates selected product fields', () =>
      productsClient.updateProduct(product.id, patch, authenticatedAdmin.token),
    );
    await test.step('Then the update is returned and persisted with omitted fields intact', async () => {
      expect(response.status()).toBe(200);
      expectJsonResponse(response);
      const updated = await response.json() as ProductResponse;
      expectProduct(updated);
      const expected = { id: product.id, ...data, ...patch, createdAt: product.createdAt };
      expect(updated).toMatchObject(expected);
      const read = await productsClient.getProduct(product.id, authenticatedAdmin.token);
      expect(read.status()).toBe(200);
      expect(await read.json()).toMatchObject(expected);
    });
  });
});
