import { randomUUID } from 'node:crypto';
import { test as adminTest, expect } from './admin.fixture';
import type { CartClient } from '../clients/cart.client';
import type { InventoryClient } from '../clients/inventory.client';
import type { OrdersClient } from '../clients/orders.client';
import type { ProductsClient } from '../clients/products.client';
import { useRegisteredUser, type AuthenticatedUser } from '../support/registered-user';
import type { Movement, Order, Page } from '../types/commerce';
import type { ProductCreateRequest, ProductResponse } from '../types/products';
import { json } from '../support/assertions/http';
import { shippingAddress } from '../data/commerce';

interface Commerce {
  cart: CartClient;
  orders: OrdersClient;
  inventory: InventoryClient;
  products: ProductsClient;
  shopper: { username: string; token: string };
  product(overrides?: Partial<ProductCreateRequest>): Promise<ProductResponse>;
  checkout(product: ProductResponse, quantity?: number): Promise<Order>;
}

export const test = adminTest.extend<{ commerce: Commerce }>({
  commerce: async ({ authClient, usersClient, cartClient: cart, ordersClient: orders,
    inventoryClient: inventory, productsClient: products, authenticatedAdmin }, use) => {
    const admin = authenticatedAdmin.token;
    const owned = new Map<string, number>();
    const orderIds: number[] = [];
    const cleanupErrors: unknown[] = [];
    let account: AuthenticatedUser | undefined;
    let primaryError: unknown;

    async function product(overrides: Partial<ProductCreateRequest> = {}): Promise<ProductResponse> {
      return test.step('Given a disposable staging product with a unique name', async () => {
        const data = {
          description: 'Disposable commerce test product', price: 12.34, stockQuantity: 7,
          category: 'API tests', imageUrl: null, ...overrides, name: `commerce-test-${randomUUID()}`,
        };
        // Track ownership before sending, including lost creation responses.
        owned.set(data.name, data.stockQuantity);
        return json<ProductResponse>(await products.createProduct(data, admin), 201);
      });
    }

    async function cancelOwnedOrders(user: AuthenticatedUser): Promise<void> {
      const page = await json<Page<Order>>(await orders.list(user.token, { size: 100 }));
      expect(page.totalElements).toBe(page.content.length);
      for (const order of page.content) {
        expect(order.username).toBe(user.user.username);
        orderIds.push(order.id);
        if (order.status === 'CANCELLED') continue;
        if (!['PENDING', 'PAID'].includes(order.status)) {
          expect((await orders.updateStatus(order.id, 'PENDING', admin)).status()).toBe(200);
        }
        expect((await orders.cancel(order.id, admin)).status()).toBe(200);
      }
    }

    async function restoreOwnedInventory(): Promise<void> {
      const catalogue = await json<ProductResponse[]>(await products.getProducts(admin));
      for (const item of catalogue.filter(item => owned.has(item.name))) {
        const movements = await json<Page<Movement>>(await inventory.movements(item.id, admin, { size: 100 }));
        expect(movements.totalElements).toBe(movements.content.length);
        const orderEffects = movements.content.filter(m => m.type === 'ORDER_DEDUCTED' || m.type === 'ORDER_RESTORED');
        expect(orderEffects.reduce((sum, m) => sum + m.delta, 0)).toBe(0);
        const delta = owned.get(item.name)! - item.stockQuantity;
        if (delta !== 0) {
          expect((await inventory.adjust(item.id, { delta, reason: 'Restore disposable test baseline', requestId: randomUUID() }, admin)).status()).toBe(201);
        }
        const restored = await json<ProductResponse>(await products.getProduct(item.id, admin));
        expect(restored.stockQuantity).toBe(owned.get(item.name));
      }
    }

    async function restoreShopperData(user: AuthenticatedUser): Promise<void> {
      await test.step('Then clear the shopper cart, cancel orders and restore owned inventory', async () => {
        expect((await cart.clearCart(user.token)).status()).toBe(204);
        // Account deletion removes orders without restoring stock: restore first.
        await cancelOwnedOrders(user);
        await restoreOwnedInventory();
      });
    }

    async function deleteOwnedProducts(): Promise<void> {
      if (owned.size === 0) return;
      await test.step('Then remove owned products after shopper and order deletion', async () => {
        // Preserve products if account or order cleanup failed.
        expect((await usersClient.getUser(account!.user.username, admin)).status()).toBe(404);
        for (const id of orderIds) expect((await orders.get(id, admin)).status()).toBe(404);
        const catalogue = await json<ProductResponse[]>(await products.getProducts(admin));
        for (const item of catalogue.filter(item => owned.has(item.name))) {
          try {
            expect((await products.deleteProduct(item.id, admin)).status()).toBe(204);
            expect((await products.getProduct(item.id, admin)).status()).toBe(404);
            expect((await inventory.get(item.id, admin)).status()).toBe(404);
            expect((await inventory.movements(item.id, admin)).status()).toBe(404);
          } catch (error) { cleanupErrors.push(error); }
        }
      });
    }

    try {
      await useRegisteredUser({ authClient, usersClient }, async user => {
        account = user;
        const shopper = { username: user.user.username, token: user.token };
        await use({
          cart, orders, inventory, products, shopper, product,
          checkout: async (item, quantity = 2) => test.step('Given an owned PENDING order created from the shopper cart', async () => {
            expect((await cart.addItem({ productId: item.id, quantity }, shopper.token)).status()).toBe(200);
            return json<Order>(await orders.create(shippingAddress, shopper.token), 201);
          }),
        });
      }, { observerToken: admin, beforeDelete: restoreShopperData });
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      try {
        await deleteOwnedProducts();
      } catch (error) { cleanupErrors.push(error); }
      if (cleanupErrors.length) {
        throw new AggregateError(primaryError !== undefined ? [primaryError, ...cleanupErrors] : cleanupErrors, 'Commerce cleanup failed');
      }
    }
  },
  // The peer is deleted before commerce tears down, removing its cart references.
  authenticatedPeer: async ({ commerce, authClient, usersClient, authenticatedAdmin }, use) =>
    useRegisteredUser({ authClient, usersClient }, use, { observerToken: authenticatedAdmin.token }),
});

export { expect, json };
