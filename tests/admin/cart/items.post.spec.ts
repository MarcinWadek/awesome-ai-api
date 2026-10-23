import { randomUUID } from 'node:crypto';
import { CartClient } from '../../../clients/cart.client';
import { ProductsClient } from '../../../clients/products.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import { expectJsonResponse } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';

test.describe('POST /api/v1/cart/items', () => {
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
    await test.step('Given an owned staging product and a new regular user with an empty cart', async () => {
      const create = await productsClient.createProduct(data, authenticatedAdmin.token);
      expect(create.status()).toBe(201);
      product = await create.json() as ProductResponse;
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 0);
    });
  });

  test.afterEach(async ({ authenticatedUser, authenticatedAdmin }) => {
    // afterEach runs before authenticatedUser deletes its account and cart rows.
    await test.step('Then clear the owned cart before removing this test\'s products', async () => {
      expect((await cartClient.clearCart(authenticatedUser.token)).status()).toBe(204);
      const read = await productsClient.getProducts(authenticatedAdmin.token);
      expect(read.status()).toBe(200);
      // Recover even if creation succeeded but its response could not be parsed.
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
    if (quantity === 0) {
      expectEmptyCart(await read.json(), username);
    } else {
      const totalPrice = Math.round(data.price * 100) * quantity / 100;
      expectCart(await read.json(), username, [{ productId: product.id, quantity }], totalPrice);
    }
  }

  test('200: adds an item and persists the cart contents and totals', async ({ authenticatedUser }) => {
    const response = await test.step('When the regular user adds two units of the owned product', () =>
      cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token),
    );
    await test.step('Then the returned and persisted cart contain exactly two units and their price', async () => {
      expect(response.status()).toBe(200);
      expectJsonResponse(response);
      expectCart(await response.json(), authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 2);
    });
  });

  test('400: rejects quantity zero without adding an item', async ({ authenticatedUser }) => {
    const response = await test.step('When the regular user adds zero units', () =>
      cartClient.addItem({ productId: product.id, quantity: 0 }, authenticatedUser.token),
    );
    await test.step('Then quantity validation fails and the persisted cart stays empty', async () => {
      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ quantity: 'must be greater than or equal to 1' });
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 0);
    });
  });

  test('401: rejects missing authentication without adding an item', async ({ authenticatedUser }) => {
    const response = await test.step('When an anonymous caller adds a valid quantity of the owned product', () =>
      cartClient.addItem({ productId: product.id, quantity: 2 }),
    );
    await test.step('Then authentication is required and the persisted user cart stays empty', async () => {
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 0);
    });
  });

  test('404: rejects a missing product without adding an item', async ({ authenticatedUser }) => {
    const response = await test.step('When the user adds absent product zero', () =>
      cartClient.addItem({ productId: 0, quantity: 1 }, authenticatedUser.token),
    );
    await test.step('Then product lookup fails and the persisted cart stays empty', async () => {
      expect(response.status()).toBe(404);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Product not found' });
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 0);
    });
  });

  test('409: rejects quantity above stock without adding an item', async ({ authenticatedUser }) => {
    const response = await test.step('When the regular user requests more than the owned product stock', () =>
      cartClient.addItem({ productId: product.id, quantity: data.stockQuantity + 1 }, authenticatedUser.token),
    );
    await test.step('Then a stock conflict identifies the product and the persisted cart stays empty', async () => {
      expect(response.status()).toBe(409);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: `Insufficient stock for product ${product.id}` });
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 0);
    });
  });

  test('409: validates accumulated quantity and rolls back an excessive repeated add', async ({ authenticatedUser }) => {
    await test.step('Given repeated adds accumulated five units in the same cart item', async () => {
      expect((await cartClient.addItem({ productId: product.id, quantity: 2 }, authenticatedUser.token)).status()).toBe(200);
      expect((await cartClient.addItem({ productId: product.id, quantity: 3 }, authenticatedUser.token)).status()).toBe(200);
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 5);
    });
    const response = await test.step('When another add would exceed available stock in total', () =>
      cartClient.addItem({ productId: product.id, quantity: 3 }, authenticatedUser.token),
    );
    await test.step('Then the stock conflict preserves the accumulated item and monetary totals', async () => {
      expect(response.status()).toBe(409);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: `Insufficient stock for product ${product.id}` });
      await expectPersistedCart(authenticatedUser.token, authenticatedUser.user.username, 5);
      expect((await productsClient.getProduct(product.id, authenticatedUser.token)).status()).toBe(200);
    });
  });
});
