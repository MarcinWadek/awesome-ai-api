import { expect, test } from '../../../fixtures/auth.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import { expectProduct } from '../../../support/assertions/products';
import type { ApiErrorResponse } from '../../../types/auth';
import type { ProductResponse } from '../../../types/products';
test.describe('GET /api/v1/products', () => {
  test('200: returns an authenticated catalogue with valid product fields', async ({ authenticatedUser, productsClient }) => {
    // When
    const response = await productsClient.getProducts(authenticatedUser.token);

    // Then
    const body = await json<ProductResponse[]>(response);
    expect(Array.isArray(body)).toBe(true);

    for (const product of body) expectProduct(product);
  });

  test('401: rejects missing authentication', async ({ productsClient }) => {
    // When
    const response = await productsClient.getProducts();

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
  });
});
