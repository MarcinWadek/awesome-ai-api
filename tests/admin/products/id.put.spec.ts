import { productData } from '../../../data/products';
import { createProduct, deleteProductsByName } from '../../../support/helpers/products';
import { test, expect } from '../../../fixtures/admin.fixture';
import { json } from '../../../support/assertions/http';
import { expectProduct, expectProductUnchanged } from '../../../support/assertions/products';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('PUT /api/v1/products/{id}', () => {
  let data: ProductCreateRequest;

  test.beforeEach(() => {
    data = productData();
  });

  test.afterEach(async ({ authenticatedAdmin, productsClient }) => {
    await deleteProductsByName(productsClient, authenticatedAdmin.token, [data.name]);
  });

  test('200: persists a partial update without changing omitted fields', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, data, authenticatedAdmin.token);
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
    const product = await createProduct(productsClient, data, authenticatedAdmin.token);

    // When
    const response = await productsClient.updateProduct(product.id, { price: -1 }, authenticatedAdmin.token);

    // Then
    expect(await json(response, 400)).toEqual({ price: 'Price must be greater than 0' });
    await expectProductUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('401: rejects product updates without authentication', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, data, authenticatedAdmin.token);

    // When
    const response = await productsClient.updateProduct(product.id, { price: 23.45 });

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectProductUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('403: rejects product updates by a staging client', async ({ authenticatedAdmin, authenticatedUser, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, data, authenticatedAdmin.token);

    // When
    const response = await productsClient.updateProduct(product.id, { price: 23.45 }, authenticatedUser.token);

    // Then
    expect(await json(response, 403)).toEqual({ message: 'Access denied' });
    await expectProductUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('404: rejects updates to a nonexistent product', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, data, authenticatedAdmin.token);
    expect((await productsClient.deleteProduct(product.id, authenticatedAdmin.token)).status()).toBe(204);
    expect((await productsClient.getProduct(product.id, authenticatedAdmin.token)).status()).toBe(404);

    // When
    const response = await productsClient.updateProduct(product.id, { price: 23.45 }, authenticatedAdmin.token);

    // Then
    expect(await json(response, 404)).toEqual({ message: 'Product not found' });
  });
});
