import { CartClient } from '../../../clients/cart.client';
import { ProductsClient } from '../../../clients/products.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectEmptyCart } from '../../../support/assertions/cart';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import type { CartResponse } from '../../../types/cart';
import type { ProductResponse } from '../../../types/products';

test.describe('DELETE /api/v1/cart', () => {
  test.describe.configure({ retries: 0 });
  let cartClient: CartClient;
  let productsClient: ProductsClient;

  test.beforeEach(({ request }) => {
    cartClient = new CartClient(request);
    productsClient = new ProductsClient(request);
  });

  test.describe('204', () => {
    test('removes all items from the authenticated user cart', async ({ authenticatedUser }) => {
      await test.step('Given a cart containing one unit of an in-stock product', async () => {
        const catalogueResponse = await productsClient.getProducts(authenticatedUser.token);
        expect(catalogueResponse.status()).toBe(200);
        expectJsonResponse(catalogueResponse);
        const products = (await catalogueResponse.json()) as ProductResponse[];
        expect(Array.isArray(products)).toBe(true);
        const product = products.find((candidate) => candidate.stockQuantity > 0);
        if (!product) throw new Error('Cart setup requires an in-stock catalogue product');

        const response = await cartClient.addItem({ productId: product.id, quantity: 1 }, authenticatedUser.token);
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const cart = (await response.json()) as CartResponse;
        expect(cart.username).toBe(authenticatedUser.user.username);
        expect(cart.items).toEqual([{ productId: product.id, quantity: 1 }]);
        expect(cart.totalItems).toBe(1);
      });

      const response = await test.step('When the user clears its populated cart', () =>
        cartClient.clearCart(authenticatedUser.token),
      );

      await test.step('Then the response is 204 with no body and the cart is empty', async () => {
        expect(response.status()).toBe(204);
        expect(await response.body()).toHaveLength(0);
        const cartResponse = await cartClient.getCart(authenticatedUser.token);
        expect(cartResponse.status()).toBe(200);
        expectJsonResponse(cartResponse);
        expectEmptyCart(await cartResponse.json(), authenticatedUser.user.username);
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async () => {
      const response = await test.step('When a cart is cleared without authentication', () =>
        cartClient.clearCart(),
      );
      await test.step('Then the response is a 401 JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
    });
  });
});
