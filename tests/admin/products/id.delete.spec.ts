import { randomUUID } from 'node:crypto';
import { ProductsClient } from '../../../clients/products.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectJsonResponse } from '../../../support/assertions/http';
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

  test('204: deletes a disposable product', async ({ authenticatedAdmin }) => {
    const product = await createProduct(authenticatedAdmin.token);
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

  test('401: rejects product deletion without authentication', async ({ authenticatedAdmin }) => {
    const product = await createProduct(authenticatedAdmin.token);
    const response = await test.step('When an anonymous caller deletes the existing product', () =>
      productsClient.deleteProduct(product.id),
    );
    await test.step('Then authentication is required and the product remains intact', async () => {
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
      await expectUnchanged(product, authenticatedAdmin.token);
    });
  });

  test('403: rejects product deletion by a staging client', async ({ authenticatedAdmin, authenticatedUser }) => {
    const product = await createProduct(authenticatedAdmin.token);
    const response = await test.step('When a staging client deletes the existing product', () =>
      productsClient.deleteProduct(product.id, authenticatedUser.token),
    );
    await test.step('Then the admin role is required and the product remains intact', async () => {
      expect(response.status()).toBe(403);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Access denied' });
      await expectUnchanged(product, authenticatedAdmin.token);
    });
  });

  test('404: rejects deletion of a nonexistent product', async ({ authenticatedAdmin }) => {
    const product = await createProduct(authenticatedAdmin.token);
    await test.step('Given the owned product has been deleted and is absent', async () => {
      expect((await productsClient.deleteProduct(product.id, authenticatedAdmin.token)).status()).toBe(204);
      expect((await productsClient.getProduct(product.id, authenticatedAdmin.token)).status()).toBe(404);
    });
    const response = await test.step('When the admin deletes that absent product ID', () =>
      productsClient.deleteProduct(product.id, authenticatedAdmin.token),
    );
    await test.step('Then a not-found response has an empty body', async () => {
      expect(response.status()).toBe(404);
      expect(await response.text()).toBe('');
    });
  });
});
