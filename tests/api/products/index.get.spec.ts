import { ProductsClient } from '../../../clients/products.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectProduct } from '../../../support/assertions/products';
import type { ApiErrorResponse } from '../../../types/auth';
import type { ProductResponse } from '../../../types/products';

test.describe('GET /api/v1/products', () => {
  test.describe.configure({ retries: 0 });
  let productsClient: ProductsClient;

  test.beforeEach(({ request }) => {
    productsClient = new ProductsClient(request);
  });

  test.describe('200', () => {
    test('returns an authenticated catalogue with valid product fields', async ({ authenticatedUser }) => {
      const response = await test.step('When the authenticated user reads the catalogue', () =>
        productsClient.getProducts(authenticatedUser.token),
      );

      await test.step('Then the response is a 200 JSON array of products', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const body = (await response.json()) as ProductResponse[];
        expect(Array.isArray(body)).toBe(true);
        for (const product of body) expectProduct(product);
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async () => {
      const response = await test.step('When an anonymous user reads the catalogue', () =>
        productsClient.getProducts(),
      );

      await test.step('Then the response is a 401 JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString(((await response.json()) as ApiErrorResponse).message);
      });
    });
  });
});
