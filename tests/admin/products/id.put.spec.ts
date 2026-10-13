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

  async function createProduct(token: string): Promise<ProductResponse> {
    return test.step('Given a unique product owned by this test', async () => {
      const response = await productsClient.createProduct(data, token);
      expect(response.status()).toBe(201);
      return await response.json() as ProductResponse;
    });
  }

  async function expectUnchanged(product: ProductResponse, token: string): Promise<void> {
    const read = await productsClient.getProduct(product.id, token);
    expect(read.status()).toBe(200);
    expect(await read.json()).toEqual(product);
  }

  test('200: persists a partial update without changing omitted fields', async ({ authenticatedAdmin }) => {
    const product = await createProduct(authenticatedAdmin.token);
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

  test('400: rejects an invalid product update', async ({ authenticatedAdmin }) => {
    const product = await createProduct(authenticatedAdmin.token);
    const response = await test.step('When the admin updates the product with a negative price', () =>
      productsClient.updateProduct(product.id, { price: -1 }, authenticatedAdmin.token),
    );
    await test.step('Then validation identifies the price and leaves the product unchanged', async () => {
      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ price: 'Price must be greater than 0' });
      await expectUnchanged(product, authenticatedAdmin.token);
    });
  });

  test('401: rejects product updates without authentication', async ({ authenticatedAdmin }) => {
    const product = await createProduct(authenticatedAdmin.token);
    const response = await test.step('When an anonymous caller submits a valid product update', () =>
      productsClient.updateProduct(product.id, { price: 23.45 }),
    );
    await test.step('Then authentication is required and the product is unchanged', async () => {
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
      await expectUnchanged(product, authenticatedAdmin.token);
    });
  });

  test('403: rejects product updates by a staging client', async ({ authenticatedAdmin, authenticatedUser }) => {
    const product = await createProduct(authenticatedAdmin.token);
    const response = await test.step('When a staging client submits a valid product update', () =>
      productsClient.updateProduct(product.id, { price: 23.45 }, authenticatedUser.token),
    );
    await test.step('Then the admin role is required and the product is unchanged', async () => {
      expect(response.status()).toBe(403);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Access denied' });
      await expectUnchanged(product, authenticatedAdmin.token);
    });
  });

  test('404: rejects updates to a nonexistent product', async ({ authenticatedAdmin }) => {
    const product = await createProduct(authenticatedAdmin.token);
    await test.step('Given the owned product has been deleted and is absent', async () => {
      expect((await productsClient.deleteProduct(product.id, authenticatedAdmin.token)).status()).toBe(204);
      expect((await productsClient.getProduct(product.id, authenticatedAdmin.token)).status()).toBe(404);
    });
    const response = await test.step('When the admin submits a valid update to that absent ID', () =>
      productsClient.updateProduct(product.id, { price: 23.45 }, authenticatedAdmin.token),
    );
    await test.step('Then a JSON not-found error is returned', async () => {
      expect(response.status()).toBe(404);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Product not found' });
    });
  });
});
