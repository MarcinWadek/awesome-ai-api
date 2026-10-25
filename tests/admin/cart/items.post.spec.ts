import { productData } from '../../../data/products';
import { clearCartAndDeleteProducts } from '../../../support/helpers/cart';
import { createProduct } from '../../../support/helpers/products';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectCart, expectPersistedCart } from '../../../support/assertions/cart';
import { json } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('POST /api/v1/cart/items', () => {
  let data: ProductCreateRequest;
  let product: ProductResponse;

  test.beforeEach(async ({ authenticatedAdmin, authenticatedUser, cartClient, productsClient }) => {
    data = productData({ description: 'Disposable cart test product' });

    // Given
    product = await createProduct(productsClient, data, authenticatedAdmin.token);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [], 0);
  });

  test.afterEach(async ({ authenticatedUser, authenticatedAdmin, cartClient, productsClient }) => {
    await clearCartAndDeleteProducts(cartClient, productsClient, authenticatedUser.token, authenticatedAdmin.token,
      [data.name]);
  });

  test('200: adds an item and persists the cart contents and totals', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token);

    // Then
    expectCart(await json(response), authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
  });

  test('400: rejects quantity zero without adding an item', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: 0 }, authenticatedUser.token);

    // Then
    expect(await json(response, 400)).toEqual({ quantity: 'must be greater than or equal to 1' });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [], 0);
  });

  test('401: rejects missing authentication without adding an item', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: 2 });

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [], 0);
  });

  test('404: rejects a missing product without adding an item', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: 0, quantity: 1 }, authenticatedUser.token);

    // Then
    expect(await json(response, 404)).toEqual({ message: 'Product not found' });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [], 0);
  });

  test('409: rejects quantity above stock without adding an item', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: data.stockQuantity + 1 }, authenticatedUser.token);

    // Then
    expect(await json(response, 409)).toEqual({ message: `Insufficient stock for product ${product.id}` });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [], 0);
  });

  test('409: validates accumulated quantity and rolls back an excessive repeated add', async ({ authenticatedUser, cartClient, productsClient }) => {
    // Given
    expect((await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token)).status()).toBe(200);
    expect((await cartClient.addItem({ productId: product.id, quantity: 3 }, authenticatedUser.token)).status()).toBe(200);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 5 }], 61.7);

    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: 3 }, authenticatedUser.token);

    // Then
    expect(await json(response, 409)).toEqual({ message: `Insufficient stock for product ${product.id}` });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, [{ productId: product.id, quantity: 5 }], 61.7);
    expect((await productsClient.getProduct(product.id, authenticatedUser.token)).status()).toBe(200);
  });
});
