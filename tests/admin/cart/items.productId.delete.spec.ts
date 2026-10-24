import { randomUUID } from 'node:crypto';
import type { CartClient } from '../../../clients/cart.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import { json, expectJsonResponse } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('DELETE /api/v1/cart/items/{productId}', () => {
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
    const read = await cartClient.getCart(authenticatedUser.token);
    expectEmptyCart(await json(read), authenticatedUser.user.username);
  });

  test.afterEach(async ({ authenticatedUser, authenticatedAdmin, cartClient, productsClient }) => {
    // Then
    // Both names are known before creation, including partially completed setup.
    expect((await cartClient.clearCart(authenticatedUser.token)).status()).toBe(204);
    const read = await productsClient.getProducts(authenticatedAdmin.token);
    expect(read.status()).toBe(200);
    const products = (await read.json()) as ProductResponse[];

    for (const owned of products.filter(candidate => candidate.name === data.name || candidate.name === `${data.name}-retained`)) {
      const remove = await productsClient.deleteProduct(owned.id, authenticatedAdmin.token);
      expect([204, 404]).toContain(remove.status());
    }
  });

  async function populateCart(cartClient: CartClient, token: string, username: string): Promise<void> {
    // Given
    const add = await cartClient.addItem({ productId: product.id, quantity: 2 }, token);
    expect(add.status()).toBe(200);
    const read = await cartClient.getCart(token);
    expect(read.status()).toBe(200);
    expectCart(await read.json(), username, [{ productId: product.id, quantity: 2 }], 24.68);
  }

  test('200: removes only the target item and persists the remaining cart', async ({ authenticatedUser, authenticatedAdmin, cartClient, productsClient }) => {
    // Given
    await populateCart(cartClient, authenticatedUser.token, authenticatedUser.user.username);
    const create = await productsClient.createProduct({
      ...data,
      name: `${data.name}-retained`,
      price: 5
    }, authenticatedAdmin.token);
    expect(create.status()).toBe(201);
    const retained = (await create.json()) as ProductResponse;
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
    await populateCart(cartClient, authenticatedUser.token, authenticatedUser.user.username);

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
