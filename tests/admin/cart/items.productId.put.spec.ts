import { randomUUID } from 'node:crypto';
import type { CartClient } from '../../../clients/cart.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import { json, expectJsonResponse } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('PUT /api/v1/cart/items/{productId}', () => {
  let data: ProductCreateRequest;
  let product: ProductResponse;

  test.beforeEach(async ({ authenticatedAdmin, authenticatedUser, cartClient, productsClient }) => {
    data = {
      name: `cart-test-${randomUUID()}`,
      description: 'Disposable cart test product',
      price: 12.34,
      stockQuantity: 7,
      category: 'API tests',
      imageUrl: null
    };

    // Given
    const create = await productsClient.createProduct(data, authenticatedAdmin.token);
    expect(create.status()).toBe(201);
    product = (await create.json()) as ProductResponse;
    const add = await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token);
    expect(add.status()).toBe(200);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 2);
  });

  test.afterEach(async ({ authenticatedUser, authenticatedAdmin, cartClient, productsClient }) => {
    // Then
    // Clear references while the user still exists, before fixture teardown.
    expect((await cartClient.clearCart(authenticatedUser.token)).status()).toBe(204);
    const read = await productsClient.getProducts(authenticatedAdmin.token);
    expect(read.status()).toBe(200);
    const products = (await read.json()) as ProductResponse[];

    for (const owned of products.filter(candidate => candidate.name === data.name)) {
      const remove = await productsClient.deleteProduct(owned.id, authenticatedAdmin.token);
      expect([204, 404]).toContain(remove.status());
    }
  });

  async function expectPersistedCart(cartClient: CartClient, token: string, username: string, quantity: number): Promise<void> {
    const read = await cartClient.getCart(token);
    expect(read.status()).toBe(200);
    expectJsonResponse(read);
    const totalPrice = Math.round(data.price * 100) * quantity / 100;
    expectCart(await read.json(), username, [{ productId: product.id, quantity }], totalPrice);
  }

  test('200: replaces and persists the item quantity and totals', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.updateItem(product.id, { quantity: 3 }, authenticatedUser.token);

    // Then
    expectCart(await json(response), authenticatedUser.user.username, [{ productId: product.id, quantity: 3 }], 37.02);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 3);
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
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 2);
  });

  test('401: rejects missing authentication without changing the cart', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.updateItem(product.id, { quantity: 3 });

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 2);
  });

  test('409: rejects quantity above stock without changing the cart', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.updateItem(product.id, { quantity: data.stockQuantity + 1 }, authenticatedUser.token);

    // Then
    expect(await json(response, 409)).toEqual({ message: `Insufficient stock for product ${product.id}` });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 2);
  });
});
