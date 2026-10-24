import { test, expect, json } from '../../../fixtures/commerce.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import type { CartResponse } from '../../../types/cart';
import type { ProductResponse } from '../../../types/products';
test.describe('DELETE /api/v1/cart', () => {
  test('204: clears all owner items and preserves another customer cart and product stock', async ({ commerce, authenticatedPeer }) => {
    // Given
    const first = await commerce.product();
    const second = await commerce.product({ price: 5 });
    expect((await commerce.cart.addItem({ productId: first.id, quantity: 2 }, commerce.shopper.token)).status()).toBe(200);
    expect((await commerce.cart.addItem({ productId: second.id, quantity: 1 }, commerce.shopper.token)).status()).toBe(200);
    expect((await commerce.cart.addItem({ productId: first.id, quantity: 1 }, authenticatedPeer.token)).status()).toBe(200);

    // When
    const response = await commerce.cart.clearCart(commerce.shopper.token);

    // Then
    expect(response.status()).toBe(204);
    expect(await response.text()).toBe('');
    expectEmptyCart(await json<CartResponse>(await commerce.cart.getCart(commerce.shopper.token)), commerce.shopper.username);
    expectCart(await json<CartResponse>(await commerce.cart.getCart(authenticatedPeer.token)), authenticatedPeer.user.username, [{ productId: first.id, quantity: 1 }], 12.34);

    for (const product of [first, second]) expect((await json<ProductResponse>(await commerce.products.getProduct(product.id, commerce.shopper.token))).stockQuantity).toBe(7);
  });
});
