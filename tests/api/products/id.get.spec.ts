import { ProductsClient } from '../../../clients/products.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectProduct } from '../../../support/assertions/products';
import type { ApiErrorResponse } from '../../../types/auth';
import type { ProductResponse } from '../../../types/products';

test.describe('GET /api/v1/products/{id}', () => {
  test.describe.configure({ retries: 0 });
  let productsClient: ProductsClient;

  test.beforeEach(({ request }) => {
    productsClient = new ProductsClient(request);
  });

  test.describe('200', () => {
    test('returns the product selected from the catalogue', async ({ authenticatedUser }) => {
      const product = await test.step('Given an existing product in the authenticated catalogue', async () => {
        const response = await productsClient.getProducts(authenticatedUser.token);
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const products = (await response.json()) as ProductResponse[];
        expect(Array.isArray(products)).toBe(true);
        expect(products.length, 'Catalogue must contain a product for the lookup case').toBeGreaterThan(0);
        expectProduct(products[0]);
        return products[0];
      });

      const response = await test.step('When the user reads the selected product by ID', () =>
        productsClient.getProduct(product.id, authenticatedUser.token),
      );

      await test.step('Then the 200 JSON product matches stable catalogue fields', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const body = (await response.json()) as ProductResponse;
        expectProduct(body);
        expect(body).toMatchObject({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          imageUrl: product.imageUrl,
          createdAt: product.createdAt,
        });
      });
    });
  });

  test.describe('400', () => {
    test('rejects a nonnumeric product ID', async ({ authenticatedUser }) => {
      const response = await test.step('When the authenticated user reads a nonnumeric ID', () =>
        productsClient.getProduct('not-a-product-id', authenticatedUser.token),
      );

      await test.step('Then the response is a 400 JSON input error', async () => {
        expect(response.status()).toBe(400);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).error);
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async () => {
      const response = await test.step('When an anonymous user reads a numeric product ID', () =>
        productsClient.getProduct(0),
      );

      await test.step('Then the response is a 401 JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString(((await response.json()) as ApiErrorResponse).message);
      });
    });
  });

  test.describe('404', () => {
    test('returns not found for an absent numeric product ID', async ({ authenticatedUser }) => {
      await test.step('Given product ID zero is absent from the catalogue', async () => {
        const response = await productsClient.getProducts(authenticatedUser.token);
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const products = (await response.json()) as ProductResponse[];
        expect(Array.isArray(products)).toBe(true);
        expect(products.some((product) => product.id === 0)).toBe(false);
      });

      const response = await test.step('When the authenticated user reads the absent ID', () =>
        productsClient.getProduct(0, authenticatedUser.token),
      );

      await test.step('Then the response is a 404 JSON not-found error', async () => {
        expect(response.status()).toBe(404);
        expectJsonResponse(response);
        expectNonEmptyString(((await response.json()) as ApiErrorResponse).message);
      });
    });
  });
});
