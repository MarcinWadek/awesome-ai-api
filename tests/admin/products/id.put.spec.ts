import { randomUUID } from 'node:crypto';
import type { ProductsClient } from '../../../clients/products.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { json } from '../../../support/assertions/http';
import { expectProduct } from '../../../support/assertions/products';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('PUT /api/v1/products/{id}', () => {
  let data: ProductCreateRequest;

  test.beforeEach(() => {
    data = {
      name: `api-test-${randomUUID()}`,
      description: 'Disposable API test product',
      price: 12.34,
      stockQuantity: 7,
      category: 'API tests',
      imageUrl: null
    };
  });

  test.afterEach(async ({ authenticatedAdmin, productsClient }) => {
    // Then
    const response = await productsClient.getProducts(authenticatedAdmin.token);
    expect(response.status()).toBe(200);
    const products = (await response.json()) as ProductResponse[];

    for (const product of products.filter(product => product.name === data.name)) {
      const cleanup = await productsClient.deleteProduct(product.id, authenticatedAdmin.token);
      expect([204, 404]).toContain(cleanup.status());
    }
  });

  async function createProduct(productsClient: ProductsClient, token: string): Promise<ProductResponse> {
    // Given
    const response = await productsClient.createProduct(data, token);
    expect(response.status()).toBe(201);
    return (await response.json()) as ProductResponse;
  }

  async function expectUnchanged(productsClient: ProductsClient, product: ProductResponse, token: string): Promise<void> {
    const read = await productsClient.getProduct(product.id, token);
    expect(read.status()).toBe(200);
    expect(await read.json()).toEqual(product);
  }

  test('200: persists a partial update without changing omitted fields', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, authenticatedAdmin.token);
    const patch = { price: 23.45, stockQuantity: 9 };

    // When
    const response = await productsClient.updateProduct(product.id, patch, authenticatedAdmin.token);

    // Then
    const updated = await json<ProductResponse>(response);
    expectProduct(updated);
    const expected = {
      id: product.id,
      ...data,
      ...patch,
      createdAt: product.createdAt
    };
    expect(updated).toMatchObject(expected);
    const read = await productsClient.getProduct(product.id, authenticatedAdmin.token);
    expect(read.status()).toBe(200);
    expect(await read.json()).toMatchObject(expected);
  });

  test('400: rejects an invalid product update', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, authenticatedAdmin.token);

    // When
    const response = await productsClient.updateProduct(product.id, { price: -1 }, authenticatedAdmin.token);

    // Then
    expect(await json(response, 400)).toEqual({ price: 'Price must be greater than 0' });
    await expectUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('401: rejects product updates without authentication', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, authenticatedAdmin.token);

    // When
    const response = await productsClient.updateProduct(product.id, { price: 23.45 });

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('403: rejects product updates by a staging client', async ({ authenticatedAdmin, authenticatedUser, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, authenticatedAdmin.token);

    // When
    const response = await productsClient.updateProduct(product.id, { price: 23.45 }, authenticatedUser.token);

    // Then
    expect(await json(response, 403)).toEqual({ message: 'Access denied' });
    await expectUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('404: rejects updates to a nonexistent product', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, authenticatedAdmin.token);
    expect((await productsClient.deleteProduct(product.id, authenticatedAdmin.token)).status()).toBe(204);
    expect((await productsClient.getProduct(product.id, authenticatedAdmin.token)).status()).toBe(404);

    // When
    const response = await productsClient.updateProduct(product.id, { price: 23.45 }, authenticatedAdmin.token);

    // Then
    expect(await json(response, 404)).toEqual({ message: 'Product not found' });
  });
});
