import { expect, test } from '../../../fixtures/auth.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import { expectProduct } from '../../../support/assertions/products';
import type { ApiErrorResponse } from '../../../types/auth';
import type { ProductResponse } from '../../../types/products';
test.describe('GET /api/v1/products/{id}', () => {
  test('200: returns the product selected from the catalogue', async ({ authenticatedUser, productsClient }) => {
    // Given
    const setupResponse = await productsClient.getProducts(authenticatedUser.token);
    const products = await json<ProductResponse[]>(setupResponse);
    expect(Array.isArray(products)).toBe(true);
    expect(products.length, 'Catalogue must contain a product for the lookup case').toBeGreaterThan(0);
    expectProduct(products[0]);
    const product = await products[0];

    // When
    const response = await productsClient.getProduct(product.id, authenticatedUser.token);

    // Then
    const body = await json<ProductResponse>(response);
    expectProduct(body);
    expect(body).toMatchObject({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl,
      createdAt: product.createdAt
    });
  });

  test('400: rejects a nonnumeric product ID', async ({ authenticatedUser, productsClient }) => {
    // When
    const response = await productsClient.getProduct('not-a-product-id', authenticatedUser.token);

    // Then
    expectNonEmptyString((await json<{ error: string }>(response, 400)).error);
  });

  test('401: rejects missing authentication', async ({ productsClient }) => {
    // When
    const response = await productsClient.getProduct(0);

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
  });

  test('404: returns not found for an absent numeric product ID', async ({ authenticatedUser, productsClient }) => {
    // Given
    const setupResponse = await productsClient.getProducts(authenticatedUser.token);
    const products = await json<ProductResponse[]>(setupResponse);
    expect(Array.isArray(products)).toBe(true);
    expect(products.some(product => product.id === 0)).toBe(false);

    // When
    const response = await productsClient.getProduct(0, authenticatedUser.token);

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 404)).message);
  });
});
