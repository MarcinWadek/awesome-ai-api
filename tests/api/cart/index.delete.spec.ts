import type { ApiErrorResponse } from '../../../types/auth';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectEmptyCart } from '../../../support/assertions/cart';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import type { CartResponse } from '../../../types/cart';
import type { ProductResponse } from '../../../types/products';
test.describe('DELETE /api/v1/cart', () => {
  test('204: removes all items from the authenticated user cart', async ({ authenticatedUser, cartClient, productsClient }) => {
    // Given
    const catalogueResponse = await productsClient.getProducts(authenticatedUser.token);
    const products = await json<ProductResponse[]>(catalogueResponse);
    expect(Array.isArray(products)).toBe(true);
    const product = products.find(candidate => candidate.stockQuantity > 0);
    if (!product) throw new Error('Cart setup requires an in-stock catalogue product');
    const setupResponse = await cartClient.addItem({ productId: product.id, quantity: 1 }, authenticatedUser.token);
    const cart = await json<CartResponse>(setupResponse);
    expect(cart.username).toBe(authenticatedUser.user.username);
    expect(cart.items).toEqual([{ productId: product.id, quantity: 1 }]);
    expect(cart.totalItems).toBe(1);

    // When
    const response = await cartClient.clearCart(authenticatedUser.token);

    // Then
    expect(response.status()).toBe(204);
    expect(await response.body()).toHaveLength(0);
    const cartResponse = await cartClient.getCart(authenticatedUser.token);
    expectEmptyCart(await json(cartResponse), authenticatedUser.user.username);
  });

  test('401: rejects missing authentication', async ({ cartClient }) => {
    // When
    const response = await cartClient.clearCart();

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
  });
});
