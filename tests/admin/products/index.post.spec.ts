import { productData } from '../../../data/products';
import { deleteProductsByName } from '../../../support/helpers/products';
import { test, expect } from '../../../fixtures/admin.fixture';
import { json, expectJsonResponse } from '../../../support/assertions/http';
import { expectProduct } from '../../../support/assertions/products';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('POST /api/v1/products', () => {
  let data: ProductCreateRequest;

  test.beforeEach(() => {
    data = productData();
  });

  test.afterEach(async ({ authenticatedAdmin, productsClient }) => {
    await deleteProductsByName(productsClient, authenticatedAdmin.token, [data.name]);
  });

  test('201: creates and persists a disposable product', async ({ authenticatedAdmin, productsClient }) => {
    // When
    const response = await productsClient.createProduct(data, authenticatedAdmin.token);

    // Then
    const product = await json<ProductResponse>(response, 201);
    expectProduct(product);
    expect(product).toMatchObject({
      ...data
    });
    const read = await productsClient.getProduct(product.id, authenticatedAdmin.token);
    expect(read.status()).toBe(200);
    expect(await read.json()).toMatchObject({
      id: product.id,
      ...data
    });
  });

  test('400: rejects an invalid product payload', async ({ authenticatedAdmin, productsClient }) => {
    // When
    const response = await productsClient.createProduct({
      ...data,
      price: -1
    }, authenticatedAdmin.token);

    // Then
    expect(await json(response, 400)).toEqual({ price: 'Price must be greater than 0' });
    const read = await productsClient.getProducts(authenticatedAdmin.token);
    expect(read.status()).toBe(200);
    expect(((await read.json()) as ProductResponse[]).some(product => product.name === data.name)).toBe(false);
  });

  test('401: rejects product creation without authentication', async ({ productsClient }) => {
    // When
    const response = await productsClient.createProduct(data);

    // Then
    expect(response.status()).toBe(401);
    expectJsonResponse(response);
  });

  test('403: rejects product creation by a staging client', async ({ authenticatedUser, productsClient }) => {
    // When
    const response = await productsClient.createProduct(data, authenticatedUser.token);

    // Then
    expect(response.status()).toBe(403);
    expectJsonResponse(response);
  });
});
