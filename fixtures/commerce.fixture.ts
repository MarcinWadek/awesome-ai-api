import { randomUUID } from 'node:crypto';
import type { APIResponse } from '@playwright/test';
import { test as adminTest, expect } from './admin.fixture';
import { AuthClient } from '../clients/auth.client';
import { CartClient } from '../clients/cart.client';
import { InventoryClient } from '../clients/inventory.client';
import { OrdersClient } from '../clients/orders.client';
import { ProductsClient } from '../clients/products.client';
import { UsersClient } from '../clients/users.client';
import { generateRegistrationData } from '../generators/registration.generator';
import { expectJsonResponse } from '../support/assertions/http';
import type { Address, Movement, Order, Page } from '../types/commerce';
import type { ProductCreateRequest, ProductResponse } from '../types/products';

export const shippingAddress: Address = {
  street: '123 Test Street', city: 'Test City', state: 'Test State', zipCode: '35-119', country: 'Poland',
};

// Validates status/JSON before decoding, so failed responses cannot masquerade as DTOs.
export async function json<T>(response: APIResponse, status = 200): Promise<T> {
  expect(response.status()).toBe(status);
  expectJsonResponse(response);
  return await response.json() as T;
}

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
  commerce: async ({ request, authenticatedAdmin }, use) => {
    const auth = new AuthClient(request);
    const users = new UsersClient(request);
    const cart = new CartClient(request);
    const orders = new OrdersClient(request);
    const inventory = new InventoryClient(request);
    const products = new ProductsClient(request);
    const admin = authenticatedAdmin.token;
    const user = generateRegistrationData();
    const owned = new Map<string, number>();
    let token: string | undefined;
    let registered = false;
    let signupAttempted = false;
    let primaryError: unknown;

    async function product(overrides: Partial<ProductCreateRequest> = {}): Promise<ProductResponse> {
      return test.step('Given a disposable staging product with a unique name', async () => {
        const data = {
          description: 'Disposable commerce test product', price: 12.34, stockQuantity: 7,
          category: 'API tests', imageUrl: null, ...overrides, name: `commerce-test-${randomUUID()}`,
        };
        // Register ownership before the request, including transport/parse failures.
        owned.set(data.name, data.stockQuantity);
        return json<ProductResponse>(await products.createProduct(data, admin), 201);
      });
    }

    try {
      await test.step('Given a disposable ordinary staging shopper', async () => {
        signupAttempted = true;
        const signup = await auth.signUp(user);
        registered = signup.status() === 201;
        expect(signup.status()).toBe(201);
        const login = await auth.signIn({ username: user.username, password: user.password });
        expect(login.status()).toBe(200);
        const body = await login.json();
        if (typeof body.token !== 'string' || !body.token.trim()) throw new Error('Shopper sign-in returned no token');
        token = body.token;
        expect(body.roles).toEqual(['ROLE_CLIENT']);
      });
      const shopper = { username: user.username, token: token! };
      await use({
        cart, orders, inventory, products, shopper, product,
        checkout: async (item, quantity = 2) => test.step('Given an owned PENDING order created from the shopper cart', async () => {
          expect((await cart.addItem({ productId: item.id, quantity }, shopper.token)).status()).toBe(200);
          return json<Order>(await orders.create(shippingAddress, shopper.token), 201);
        }),
      });
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      const errors: unknown[] = [];
      let ordersRemoved = !signupAttempted;
      await test.step('Then clear carts, restore stock, remove owned orders/users and products', async () => {
        try {
          // Recover an account created before setup failed or a response was lost.
          if (!token && signupAttempted) {
            const login = await auth.signIn({ username: user.username, password: user.password });
            if (login.status() === 200) { token = (await login.json()).token; registered = true; }
            else { expect(login.status()).toBe(401); expect(registered).toBe(false); ordersRemoved = true; }
          }
          if (token) {
            expect((await cart.clearCart(token)).status()).toBe(204);
            const page = await json<Page<Order>>(await orders.list(token, { size: 100 }));
            expect(page.totalElements).toBe(page.content.length);
            for (const order of page.content) {
              expect(order.username).toBe(user.username);
              if (order.status !== 'CANCELLED') {
                if (!['PENDING', 'PAID'].includes(order.status)) {
                  expect((await orders.updateStatus(order.id, 'PENDING', admin)).status()).toBe(200);
                }
                expect((await orders.cancel(order.id, admin)).status()).toBe(200);
              }
            }
            // Do not rely on user deletion to restore checkout inventory.
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
            expect((await users.forgetUser(user.username, token)).status()).toBe(204);
            for (const order of page.content) expect((await orders.get(order.id, admin)).status()).toBe(404);
            expect((await users.getUser(user.username, admin)).status()).toBe(404);
            ordersRemoved = true;
          }
        } catch (error) { errors.push(error); }

        // Preserve products if order cleanup failed; report every independent product failure.
        if (ordersRemoved) {
          try {
            const catalogue = await json<ProductResponse[]>(await products.getProducts(admin));
            for (const item of catalogue.filter(item => owned.has(item.name))) {
              try {
                expect((await products.deleteProduct(item.id, admin)).status()).toBe(204);
                expect((await products.getProduct(item.id, admin)).status()).toBe(404);
                expect((await inventory.get(item.id, admin)).status()).toBe(404);
                expect((await inventory.movements(item.id, admin)).status()).toBe(404);
              } catch (error) { errors.push(error); }
            }
          } catch (error) { errors.push(error); }
        }
      });
      if (errors.length) throw new AggregateError(primaryError ? [primaryError, ...errors] : errors, 'Commerce cleanup failed');
    }
  },
});

export { expect };
