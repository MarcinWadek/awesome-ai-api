import { productData } from '../../../data/products';
import { clearCartAndDeleteProducts } from '../../../support/helpers/cart';
import { createProduct } from '../../../support/helpers/products';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectCart, expectEmptyCart, expectPersistedCart } from '../../../support/assertions/cart';
import { json } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('PUT /api/v1/cart/items/{productId}', () => {
  let data: ProductCreateRequest;
  let product: ProductResponse;

  test.beforeEach(async ({ authenticatedAdmin, authenticatedUser, cartClient, productsClient }) => {
    data = productData({ description: 'Disposable cart test product' });

    // Given
    product = await createProduct(productsClient, data, authenticatedAdmin.token);
    const add = await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token);
    expect(add.status()).toBe(200);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
  });

  test.afterEach(async ({ authenticatedUser, authenticatedAdmin, cartClient, productsClient }) => {
    await clearCartAndDeleteProducts(cartClient, productsClient, authenticatedUser.token, authenticatedAdmin.token,
      [data.name]);
  });

  test('200: replaces and persists the item quantity and totals', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.updateItem(product.id, { quantity: 3 }, authenticatedUser.token);

    // Then
    expectCart(await json(response), authenticatedUser.user.username, [{ productId: product.id, quantity: 3 }], 37.02);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 3 }], 37.02);
  });

  test('200: quantity zero removes the item and persists an empty cart', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.updateItem(product.id, { quantity: 0 }, authenticatedUser.token);

    // Then
    expectEmptyCart(await json(response), authenticatedUser.user.username);
    const read = await cartClient.getCart(authenticatedUser.token);
    expect(read.status()).toBe(200);
    expectEmptyCart(await read.json(), authenticatedUser.user.username);
  });

  test('400: rejects negative quantity without changing the cart', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.updateItem(product.id, { quantity: -1 }, authenticatedUser.token);

    // Then
    expect(await json(response, 400)).toEqual({ quantity: 'Quantity cannot be negative' });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
  });

  test('401: rejects missing authentication without changing the cart', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.updateItem(product.id, { quantity: 3 });

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
  });

  test('409: rejects quantity above stock without changing the cart', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.updateItem(product.id, { quantity: data.stockQuantity + 1 }, authenticatedUser.token);

    // Then
    expect(await json(response, 409)).toEqual({ message: `Insufficient stock for product ${product.id}` });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
  });
});
