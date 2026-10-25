import { productData } from '../../../data/products';
import { clearCartAndDeleteProducts } from '../../../support/helpers/cart';
import { createProduct } from '../../../support/helpers/products';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectCart, expectEmptyCart, expectPersistedCart } from '../../../support/assertions/cart';
import { json, expectJsonResponse } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('DELETE /api/v1/cart/items/{productId}', () => {
  let data: ProductCreateRequest;
  let product: ProductResponse;

  test.beforeEach(async ({ authenticatedAdmin, authenticatedUser, cartClient, productsClient }) => {
    data = productData({ description: 'Disposable cart test product' });

    // Given
    product = await createProduct(productsClient, data, authenticatedAdmin.token);
    const read = await cartClient.getCart(authenticatedUser.token);
    expectEmptyCart(await json(read), authenticatedUser.user.username);
  });

  test.afterEach(async ({ authenticatedUser, authenticatedAdmin, cartClient, productsClient }) => {
    await clearCartAndDeleteProducts(cartClient, productsClient, authenticatedUser.token, authenticatedAdmin.token,
      [data.name, `${data.name}-retained`]);
  });

  test('200: removes only the target item and persists the remaining cart', async ({ authenticatedUser, authenticatedAdmin, cartClient, productsClient }) => {
    // Given
    expect((await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token)).status()).toBe(200);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
    const retained = await createProduct(productsClient, { ...data, name: `${data.name}-retained`, price: 5 }, authenticatedAdmin.token);
    const add = await cartClient.addItem({ productId: retained.id, quantity: 1 }, authenticatedUser.token);
    expect(add.status()).toBe(200);
    expectCart(await add.json(), authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }, { productId: retained.id, quantity: 1 }], 29.68);

    // When
    const response = await cartClient.removeItem(product.id, authenticatedUser.token);

    // Then
    expect(response.status()).toBe(200);
    expectJsonResponse(response);
    const expectedItems = [{ productId: retained.id, quantity: 1 }];
    expectCart(await response.json(), authenticatedUser.user.username, expectedItems, 5);
    const read = await cartClient.getCart(authenticatedUser.token);
    expectCart(await json(read), authenticatedUser.user.username, expectedItems, 5);
  });

  test('401: rejects missing authentication without removing the item', async ({ authenticatedUser, cartClient }) => {
    // Given
    expect((await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token)).status()).toBe(200);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);

    // When
    const response = await cartClient.removeItem(product.id);

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    const read = await cartClient.getCart(authenticatedUser.token);
    expectCart(await json(read), authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
  });

  test('404: rejects an existing product absent from the cart', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.removeItem(product.id, authenticatedUser.token);

    // Then
    expect(await json(response, 404)).toEqual({ message: 'Cart item not found' });
    const read = await cartClient.getCart(authenticatedUser.token);
    expectEmptyCart(await json(read), authenticatedUser.user.username);
  });
});
