import { randomUUID } from 'node:crypto';
import { CartClient } from '../../../clients/cart.client';
import { ProductsClient } from '../../../clients/products.client';
import { test, expect } from '../../../fixtures/admin.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import { expectJsonResponse } from '../../../support/assertions/http';
import type { ProductCreateRequest, ProductResponse } from '../../../types/products';

test.describe('DELETE /api/v1/cart/items/{productId}', () => {
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
      const read = await cartClient.getCart(authenticatedUser.token);
      expect(read.status()).toBe(200);
      expectJsonResponse(read);
      expectEmptyCart(await read.json(), authenticatedUser.user.username);
    });
  });

  test.afterEach(async ({ authenticatedUser, authenticatedAdmin }) => {
    // Both names are known before creation, including partially completed setup.
    await test.step('Then clear the owned cart before removing this test\'s products', async () => {
      expect((await cartClient.clearCart(authenticatedUser.token)).status()).toBe(204);
      const read = await productsClient.getProducts(authenticatedAdmin.token);
      expect(read.status()).toBe(200);
      const products = await read.json() as ProductResponse[];
      for (const owned of products.filter(candidate =>
        candidate.name === data.name || candidate.name === `${data.name}-retained`,
      )) {
        const remove = await productsClient.deleteProduct(owned.id, authenticatedAdmin.token);
        expect([204, 404]).toContain(remove.status());
      }
    });
  });

  async function populateCart(token: string, username: string): Promise<void> {
    await test.step('Given the user cart contains two units of the target product', async () => {
      const add = await cartClient.addItem({ productId: product.id, quantity: 2 }, token);
      expect(add.status()).toBe(200);
      const read = await cartClient.getCart(token);
      expect(read.status()).toBe(200);
      expectCart(await read.json(), username, [{ productId: product.id, quantity: 2 }], 24.68);
    });
  }

  test('200: removes only the target item and persists the remaining cart', async ({ authenticatedUser, authenticatedAdmin }) => {
    await populateCart(authenticatedUser.token, authenticatedUser.user.username);
    const retained = await test.step('Given a second owned product also remains in the user cart', async () => {
      const create = await productsClient.createProduct({ ...data, name: `${data.name}-retained`, price: 5 }, authenticatedAdmin.token);
      expect(create.status()).toBe(201);
      const retained = await create.json() as ProductResponse;
      const add = await cartClient.addItem({ productId: retained.id, quantity: 1 }, authenticatedUser.token);
      expect(add.status()).toBe(200);
      expectCart(await add.json(), authenticatedUser.user.username, [
        { productId: product.id, quantity: 2 },
        { productId: retained.id, quantity: 1 },
      ], 29.68);
      return retained;
    });
    const response = await test.step('When the regular user removes the target product', () =>
      cartClient.removeItem(product.id, authenticatedUser.token),
    );
    await test.step('Then the target is absent and the other item and its totals are returned and persisted', async () => {
      expect(response.status()).toBe(200);
      expectJsonResponse(response);
      const expectedItems = [{ productId: retained.id, quantity: 1 }];
      expectCart(await response.json(), authenticatedUser.user.username, expectedItems, 5);
      const read = await cartClient.getCart(authenticatedUser.token);
      expect(read.status()).toBe(200);
      expectJsonResponse(read);
      expectCart(await read.json(), authenticatedUser.user.username, expectedItems, 5);
    });
  });

  test('401: rejects missing authentication without removing the item', async ({ authenticatedUser }) => {
    await populateCart(authenticatedUser.token, authenticatedUser.user.username);
    const response = await test.step('When an anonymous caller removes the present item', () =>
      cartClient.removeItem(product.id),
    );
    await test.step('Then authentication is required and the persisted cart is unchanged', async () => {
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
      const read = await cartClient.getCart(authenticatedUser.token);
      expect(read.status()).toBe(200);
      expectJsonResponse(read);
      expectCart(await read.json(), authenticatedUser.user.username, [{ productId: product.id, quantity: 2 }], 24.68);
    });
  });

  test('404: rejects an existing product absent from the cart', async ({ authenticatedUser }) => {
    const response = await test.step('When the regular user removes a product never added to its cart', () =>
      cartClient.removeItem(product.id, authenticatedUser.token),
    );
    await test.step('Then a cart-item not-found error is returned and the persisted cart stays empty', async () => {
      expect(response.status()).toBe(404);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Cart item not found' });
      const read = await cartClient.getCart(authenticatedUser.token);
      expect(read.status()).toBe(200);
      expectJsonResponse(read);
      expectEmptyCart(await read.json(), authenticatedUser.user.username);
    });
  });
});
