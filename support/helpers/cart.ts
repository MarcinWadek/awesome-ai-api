import { expect } from '@playwright/test';
import type { CartClient } from '../../clients/cart.client';
import type { ProductsClient } from '../../clients/products.client';
import { deleteProductsByName } from './products';

export async function clearCartAndDeleteProducts(
  cart: CartClient, products: ProductsClient, shopperToken: string, adminToken: string, names: string[],
): Promise<void> {
  // Remove cart references while the user exists and before deleting products.
  expect((await cart.clearCart(shopperToken)).status()).toBe(204);
  await deleteProductsByName(products, adminToken, names);
}
