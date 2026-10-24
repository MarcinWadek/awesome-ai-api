import { randomUUID } from 'node:crypto';
import type { CartClient } from '../../../clients/cart.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import { json } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';
test.describe('POST /api/v1/cart/items', () => {
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
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 0);
  });

  test.afterEach(async ({ authenticatedUser, authenticatedAdmin, cartClient, productsClient }) => {
    // Then
    // afterEach runs before authenticatedUser deletes its account and cart rows.
    expect((await cartClient.clearCart(authenticatedUser.token)).status()).toBe(204);
    const read = await productsClient.getProducts(authenticatedAdmin.token);
    expect(read.status()).toBe(200);
    // Recover even if creation succeeded but its response could not be parsed.
    const products = (await read.json()) as ProductResponse[];

    for (const owned of products.filter(candidate => candidate.name === data.name)) {
      const remove = await productsClient.deleteProduct(owned.id, authenticatedAdmin.token);
      expect([204, 404]).toContain(remove.status());
    }
  });

  async function expectPersistedCart(cartClient: CartClient, token: string, username: string, quantity: number): Promise<void> {
    const read = await cartClient.getCart(token);
    if (quantity === 0) {
      expectEmptyCart(await json(read), username);
    } else {
      const totalPrice = Math.round(data.price * 100) * quantity / 100;
      expectCart(await read.json(), username, [{ productId: product.id, quantity }], totalPrice);
    }
  }

  test('200: adds an item and persists the cart contents and totals', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token);

    // Then
    expectCart(await json(response), authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 2);
  });

  test('400: rejects quantity zero without adding an item', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: 0 }, authenticatedUser.token);

    // Then
    expect(await json(response, 400)).toEqual({ quantity: 'must be greater than or equal to 1' });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 0);
  });

  test('401: rejects missing authentication without adding an item', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: 2 });

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 0);
  });

  test('404: rejects a missing product without adding an item', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: 0, quantity: 1 }, authenticatedUser.token);

    // Then
    expect(await json(response, 404)).toEqual({ message: 'Product not found' });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 0);
  });

  test('409: rejects quantity above stock without adding an item', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: data.stockQuantity + 1 }, authenticatedUser.token);

    // Then
    expect(await json(response, 409)).toEqual({ message: `Insufficient stock for product ${product.id}` });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 0);
  });

  test('409: validates accumulated quantity and rolls back an excessive repeated add', async ({ authenticatedUser, cartClient, productsClient }) => {
    // Given
    expect((await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token)).status()).toBe(200);
    expect((await cartClient.addItem({ productId: product.id, quantity: 3 }, authenticatedUser.token)).status()).toBe(200);
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 5);

    // When
    const response = await cartClient.addItem({ productId: product.id, quantity: 3 }, authenticatedUser.token);

    // Then
    expect(await json(response, 409)).toEqual({ message: `Insufficient stock for product ${product.id}` });
    await expectPersistedCart(cartClient, authenticatedUser.token, authenticatedUser.user.username, 5);
    expect((await productsClient.getProduct(product.id, authenticatedUser.token)).status()).toBe(200);
  });
});
