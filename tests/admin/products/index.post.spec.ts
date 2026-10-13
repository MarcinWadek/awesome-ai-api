import { randomUUID } from 'node:crypto';
import { ProductsClient } from '../../../clients/products.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectJsonResponse } from '../../../support/assertions/http';
import { expectProduct } from '../../../support/assertions/products';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';

test.describe('POST /api/v1/products', () => {
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

  test('201: creates and persists a disposable product', async ({ authenticatedAdmin }) => {
    const response = await test.step('When the admin creates a unique product', () =>
      productsClient.createProduct(data, authenticatedAdmin.token),
    );
    const product = await test.step('Then the response contains the created product', async () => {
      expect(response.status()).toBe(201);
      expectJsonResponse(response);
      const product = await response.json() as ProductResponse;
      expectProduct(product);
      expect(product).toMatchObject({ ...data });
      return product;
    });
    await test.step('Then the submitted fields are persisted', async () => {
      const read = await productsClient.getProduct(product.id, authenticatedAdmin.token);
      expect(read.status()).toBe(200);
      expect(await read.json()).toMatchObject({ id: product.id, ...data });
    });
  });

  test('401: rejects product creation without authentication', async () => {
    const response = await test.step('When an anonymous request tries to create a product with valid data', () =>
      productsClient.createProduct(data),
    );
    await test.step('Then authentication is required', async () => {
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
    });
  });

  test('403: rejects product creation by a staging client', async ({ authenticatedUser }) => {
    const response = await test.step('When a staging client tries to create a product with valid data', () =>
      productsClient.createProduct(data, authenticatedUser.token),
    );
    await test.step('Then the admin role is required', async () => {
      expect(response.status()).toBe(403);
      expectJsonResponse(response);
    });
  });
});
