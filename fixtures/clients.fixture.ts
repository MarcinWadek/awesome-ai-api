import { test as base } from '@playwright/test';
import { AuthClient } from '../clients/auth.client';
import { CartClient } from '../clients/cart.client';
import { InventoryClient } from '../clients/inventory.client';
import { MfaClient } from '../clients/mfa.client';
import { OllamaClient } from '../clients/ollama.client';
import { OrdersClient } from '../clients/orders.client';
import { ProductsClient } from '../clients/products.client';
import { UsersClient } from '../clients/users.client';

// Clients are lazy and test-scoped. Creating one never signs in or creates data.
export const test = base.extend<{
  authClient: AuthClient;
  cartClient: CartClient;
  inventoryClient: InventoryClient;
  mfaClient: MfaClient;
  ollamaClient: OllamaClient;
  ordersClient: OrdersClient;
  productsClient: ProductsClient;
  usersClient: UsersClient;
}>({
  // All scenario fixtures inherit this protection for credentials and tokens.
  trace: 'off',
  authClient: async ({ request }, use) => use(new AuthClient(request)),
  cartClient: async ({ request }, use) => use(new CartClient(request)),
  inventoryClient: async ({ request }, use) => use(new InventoryClient(request)),
  mfaClient: async ({ request }, use) => use(new MfaClient(request)),
  ollamaClient: async ({ request }, use) => use(new OllamaClient(request)),
  ordersClient: async ({ request }, use) => use(new OrdersClient(request)),
  productsClient: async ({ request }, use) => use(new ProductsClient(request)),
  usersClient: async ({ request }, use) => use(new UsersClient(request)),
});

export { expect } from '@playwright/test';
