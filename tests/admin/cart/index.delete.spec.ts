import { test, expect, json } from '../../../fixtures/commerce.fixture';
import { expectCart, expectEmptyCart } from '../../../support/assertions/cart';
import type { CartResponse } from '../../../types/cart';
import type { ProductResponse } from '../../../types/products';

test.describe('DELETE /api/v1/cart', () => {
  test('204: clears all owner items and preserves another customer cart and product stock', async ({ commerce: c, authenticatedPeer }) => {
    const first = await c.product();
    const second = await c.product({ price: 5 });
    try {
      await test.step('Given two populated customer carts sharing an owned product', async () => {
        expect((await c.cart.addItem({ productId: first.id, quantity: 2 }, c.shopper.token)).status()).toBe(200);
        expect((await c.cart.addItem({ productId: second.id, quantity: 1 }, c.shopper.token)).status()).toBe(200);
        expect((await c.cart.addItem({ productId: first.id, quantity: 1 }, authenticatedPeer.token)).status()).toBe(200);
      });
      const response = await test.step('When the shopper clears its cart', () => c.cart.clearCart(c.shopper.token));
      await test.step('Then only the owner cart is empty and no stock changed', async () => {
        expect(response.status()).toBe(204);
        expect(await response.text()).toBe('');
        expectEmptyCart(await json<CartResponse>(await c.cart.getCart(c.shopper.token)), c.shopper.username);
        expectCart(await json<CartResponse>(await c.cart.getCart(authenticatedPeer.token)), authenticatedPeer.user.username, [{ productId: first.id, quantity: 1 }], 12.34);
        for (const product of [first, second]) expect((await json<ProductResponse>(await c.products.getProduct(product.id, c.shopper.token))).stockQuantity).toBe(7);
      });
    } finally {
      await test.step('Then clear the peer cart before commerce fixture product cleanup', async () => { expect((await c.cart.clearCart(authenticatedPeer.token)).status()).toBe(204); });
    }
  });
});
