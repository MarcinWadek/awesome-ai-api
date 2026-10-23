import { randomUUID } from 'node:crypto';
import { CartClient } from '../../../clients/cart.client';
import { ProductsClient } from '../../../clients/products.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import { expectJsonResponse } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';

test.describe('PUT /api/v1/cart/items/{productId}', () => {
  let cartClient: CartClient;
  let productsClient: ProductsClient;
  let data: ProductCreateRequest;
  let product: ProductResponse;

  test.beforeEach(async ({ request, authenticatedAdmin, authenticatedUser }) => {
    cartClient = new CartClient(request);
    productsClient = new ProductsClient(request);
    data = {
      name: `cart-test-${randomUUID()}`,
      description: 'Disposable cart test product',
      price: 12.34,
      stockQuantity: 7,
      category: 'API tests',
      imageUrl: null,
    };
    await test.step('Given a regular staging user with two units of its owned product in the cart', async () => {
      const create = await productsClient.createProduct(data, authenticatedAdmin.token);
      expect(create.status()).toBe(201);
      product = await create.json() as ProductResponse;
      const add = await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token);
      expect(add.status()).toBe(200);
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 2);
    });
  });

  test.afterEach(async ({ authenticatedUser, authenticatedAdmin }) => {
    // Clear references while the user still exists, before fixture teardown.
    await test.step('Then clear the owned cart before removing this test\'s products', async () => {
      expect((await cartClient.clearCart(authenticatedUser.token)).status()).toBe(204);
      const read = await productsClient.getProducts(authenticatedAdmin.token);
      expect(read.status()).toBe(200);
      const products = await read.json() as ProductResponse[];
      for (const owned of products.filter(candidate => candidate.name === data.name)) {
        const remove = await productsClient.deleteProduct(owned.id, authenticatedAdmin.token);
        expect([204, 404]).toContain(remove.status());
      }
    });
  });

  async function expectPersistedCart(token: string, username: string, quantity: number): Promise<void> {
    const read = await cartClient.getCart(token);
    expect(read.status()).toBe(200);
    expectJsonResponse(read);
    const totalPrice = Math.round(data.price * 100) * quantity / 100;
    expectCart(await read.json(), username, [{ productId: product.id, quantity }], totalPrice);
  }

  test('200: replaces and persists the item quantity and totals', async ({ authenticatedUser }) => {
    const response = await test.step('When the regular user sets the quantity to three', () =>
      cartClient.updateItem(product.id, { quantity: 3 }, authenticatedUser.token),
    );
    await test.step('Then the returned and persisted quantity is three with recalculated totals', async () => {
      expect(response.status()).toBe(200);
      expectJsonResponse(response);
      expectCart(await response.json(), authenticatedUser.user.username, [{ productId: product.id, quantity: 3 }], 37.02);
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 3);
    });
  });

  test('200: quantity zero removes the item and persists an empty cart', async ({ authenticatedUser }) => {
    const response = await test.step('When the user sets the item quantity to zero', () =>
      cartClient.updateItem(product.id, { quantity: 0 }, authenticatedUser.token),
    );
    await test.step('Then zero acts as removal and the persisted cart has zero totals', async () => {
      expect(response.status()).toBe(200);
      expectJsonResponse(response);
      expectEmptyCart(await response.json(), authenticatedUser.user.username);
      const read = await cartClient.getCart(authenticatedUser.token);
      expect(read.status()).toBe(200);
      expectEmptyCart(await read.json(), authenticatedUser.user.username);
    });
  });

  test('400: rejects negative quantity without changing the cart', async ({ authenticatedUser }) => {
    const response = await test.step('When the regular user sets a negative quantity', () =>
      cartClient.updateItem(product.id, { quantity: -1 }, authenticatedUser.token),
    );
    await test.step('Then quantity validation fails and the persisted cart is unchanged', async () => {
      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ quantity: 'Quantity cannot be negative' });
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 2);
    });
  });

  test('401: rejects missing authentication without changing the cart', async ({ authenticatedUser }) => {
    const response = await test.step('When an anonymous caller submits a valid quantity update', () =>
      cartClient.updateItem(product.id, { quantity: 3 }),
    );
    await test.step('Then authentication is required and the persisted cart is unchanged', async () => {
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 2);
    });
  });

  test('409: rejects quantity above stock without changing the cart', async ({ authenticatedUser }) => {
    const response = await test.step('When the regular user sets quantity above the owned product stock', () =>
      cartClient.updateItem(product.id, { quantity: data.stockQuantity + 1 }, authenticatedUser.token),
    );
    await test.step('Then a stock conflict identifies the product and the persisted cart is unchanged', async () => {
      expect(response.status()).toBe(409);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: `Insufficient stock for product ${product.id}` });
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 2);
    });
  });
});
