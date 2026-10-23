import { randomUUID } from 'node:crypto';
import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { InventoryItem, Movement, Page } from '../../../types/commerce';

test.describe('POST /api/v1/admin/inventory/{productId}/adjustments', () => {
  test('201: applies positive and negative deltas, records movements and replays idempotently', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const increase = { delta: 3, reason: 'Disposable restock', requestId: randomUUID() };
    const response = await test.step('When the administrator adds three units', () => c.inventory.adjust(product.id, increase, authenticatedAdmin.token));
    await test.step('Then the exact movement is returned and replay does not apply it twice', async () => {
      const movement = await json<Movement>(response, 201);
      expect(movement).toMatchObject({ productId: product.id, orderId: null, type: 'ADMIN_ADJUSTMENT', delta: 3, quantityAfter: 10, reason: increase.reason, requestId: increase.requestId });
      expect(movement.id).toBeGreaterThan(0);
      expect(movement.actor.length).toBeGreaterThan(0);
      expect(movement.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(await json<Movement>(await c.inventory.adjust(product.id, increase, authenticatedAdmin.token), 201)).toEqual(movement);
      expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(10);
      const decrease = { delta: -10, reason: 'Disposable depletion', requestId: randomUUID() };
      const subtraction = await json<Movement>(await c.inventory.adjust(product.id, decrease, authenticatedAdmin.token), 201);
      expect(subtraction).toMatchObject({ delta: -10, quantityAfter: 0, type: 'ADMIN_ADJUSTMENT', requestId: decrease.requestId });
      expect(await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 0, stockStatus: 'OUT_OF_STOCK' });
      expect((await json<{ stockQuantity: number }>(await c.products.getProduct(product.id, c.shopper.token))).stockQuantity).toBe(0);
      const history = await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token));
      expect(history.totalElements).toBe(3);
      expect(history.content).toEqual([subtraction, movement, expect.objectContaining({ type: 'INITIAL_STOCK', delta: 7, quantityAfter: 7 })]);
    });
  });

  test('400: rejects zero delta without changing stock or movements', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const response = await test.step('When the administrator submits zero delta', () => c.inventory.adjust(product.id, { delta: 0, reason: 'Invalid adjustment', requestId: randomUUID() }, authenticatedAdmin.token));
    await test.step('Then validation rejects the adjustment without side effects', async () => {
      expect(await json(response, 400)).toEqual({ deltaNonZero: 'delta must not be zero' });
      expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
      expect((await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(1);
    });
  });

  for (const [status, actor] of [[401, 'anonymous'], [403, 'customer']] as const) {
    test(`${status}: rejects ${actor} adjustments without changing stock`, async ({ commerce: c, authenticatedAdmin }) => {
      const product = await c.product();
      const response = await test.step(`When the ${actor} submits a valid adjustment`, () => c.inventory.adjust(product.id, { delta: 2, reason: 'Unauthorized change', requestId: randomUUID() }, actor === 'customer' ? c.shopper.token : undefined));
      await test.step('Then access is rejected and inventory is unchanged', async () => {
        expect(await json(response, status)).toEqual({ message: status === 401 ? 'Unauthorized' : 'Access denied' });
        expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
        expect((await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(1);
      });
    });
  }

  test('409: rejects negative resulting stock without recording a movement', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const response = await test.step('When the administrator subtracts more units than available', () => c.inventory.adjust(product.id, { delta: -8, reason: 'Controlled underflow', requestId: randomUUID() }, authenticatedAdmin.token));
    await test.step('Then stock remains nonnegative and the ledger is unchanged', async () => {
      expect(await json(response, 409)).toEqual({ message: 'Insufficient stock' });
      expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
      expect((await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(1);
    });
  });

  test('409: rejects conflicting requestId reuse without applying another adjustment', async ({ commerce: c, authenticatedAdmin }) => {
    const product = await c.product();
    const data = { delta: 2, reason: 'First adjustment', requestId: randomUUID() };
    await test.step('Given the requestId already recorded an adjustment', async () => { expect((await c.inventory.adjust(product.id, data, authenticatedAdmin.token)).status()).toBe(201); });
    const response = await test.step('When the administrator reuses that requestId with a changed reason', () => c.inventory.adjust(product.id, { ...data, reason: 'Changed adjustment' }, authenticatedAdmin.token));
    await test.step('Then the conflict leaves stock and movement count unchanged', async () => {
      expect(await json(response, 409)).toEqual({ message: 'requestId already used with different payload' });
      expect((await json<InventoryItem>(await c.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(9);
      expect((await json<Page<Movement>>(await c.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(2);
    });
  });
});
