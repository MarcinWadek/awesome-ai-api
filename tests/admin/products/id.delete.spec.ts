import { productData } from '../../../data/products';
import { createProduct, deleteProductsByName } from '../../../support/helpers/products';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectProductUnchanged } from '../../../support/assertions/products';
import { json } from '../../../support/assertions/http';
import type { ProductCreateRequest } from '../../../types/products';
test.describe('DELETE /api/v1/products/{id}', () => {
  let data: ProductCreateRequest;

  test.beforeEach(() => {
    data = productData();
  });

  test.afterEach(async ({ authenticatedAdmin, productsClient }) => {
    await deleteProductsByName(productsClient, authenticatedAdmin.token, [data.name]);
  });

  test('204: deletes a disposable product', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, data, authenticatedAdmin.token);

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
    const product = await createProduct(productsClient, data, authenticatedAdmin.token);

    // When
    const response = await productsClient.deleteProduct(product.id);

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectProductUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('403: rejects product deletion by a staging client', async ({ authenticatedAdmin, authenticatedUser, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, data, authenticatedAdmin.token);

    // When
    const response = await productsClient.deleteProduct(product.id, authenticatedUser.token);

    // Then
    expect(await json(response, 403)).toEqual({ message: 'Access denied' });
    await expectProductUnchanged(productsClient, product, authenticatedAdmin.token);
  });

  test('404: rejects deletion of a nonexistent product', async ({ authenticatedAdmin, productsClient }) => {
    // Given
    const product = await createProduct(productsClient, data, authenticatedAdmin.token);
    expect((await productsClient.deleteProduct(product.id, authenticatedAdmin.token)).status()).toBe(204);
    expect((await productsClient.getProduct(product.id, authenticatedAdmin.token)).status()).toBe(404);

    // When
    const response = await productsClient.deleteProduct(product.id, authenticatedAdmin.token);

    // Then
    expect(response.status()).toBe(404);
    expect(await response.text()).toBe('');
  });
});
