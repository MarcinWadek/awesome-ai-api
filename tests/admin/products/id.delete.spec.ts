import { randomUUID } from 'node:crypto';
import type { ProductsClient } from '../../../clients/products.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { json } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('DELETE /api/v1/products/{id}', () => {
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

  test('204: deletes a disposable product', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, authenticatedAdmin.token);

    // When
    const response = await productsClient.deleteProduct(product.id, authenticatedAdmin.token);

    // Then
    expect(response.status()).toBe(204);
    expect(await response.text()).toBe('');
    const read = await productsClient.getProduct(product.id, authenticatedAdmin.token);
    expect(read.status()).toBe(404);
  });

  test('401: rejects product deletion without authentication', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, authenticatedAdmin.token);

    // When
    const response = await productsClient.deleteProduct(product.id);

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('403: rejects product deletion by a staging client', async ({ authenticatedAdmin, authenticatedUser, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, authenticatedAdmin.token);

    // When
    const response = await productsClient.deleteProduct(product.id, authenticatedUser.token);

    // Then
    expect(await json(response, 403)).toEqual({ message: 'Access denied' });
    await expectUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('404: rejects deletion of a nonexistent product', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, authenticatedAdmin.token);
    expect((await productsClient.deleteProduct(product.id, authenticatedAdmin.token)).status()).toBe(204);
    expect((await productsClient.getProduct(product.id, authenticatedAdmin.token)).status()).toBe(404);

    // When
    const response = await productsClient.deleteProduct(product.id, authenticatedAdmin.token);

    // Then
    expect(response.status()).toBe(404);
    expect(await response.text()).toBe('');
  });
});
