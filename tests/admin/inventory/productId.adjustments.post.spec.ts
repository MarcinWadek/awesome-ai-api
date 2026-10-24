import { randomUUID } from 'node:crypto';
import { test, expect, json } from '../../../fixtures/commerce.fixture';
import type { InventoryItem, Movement, Page } from '../../../types/commerce';
test.describe('POST /api/v1/admin/inventory/{productId}/adjustments', () => {
  test('201: applies positive and negative deltas, records movements and replays idempotently', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    const increase = { delta: 3, reason: 'Disposable restock', requestId: randomUUID() };

    // When
    const response = await commerce.inventory.adjust(product.id, increase, authenticatedAdmin.token);

    // Then
    const movement = await json<Movement>(response, 201);
    expect(movement).toMatchObject({
      productId: product.id,
      orderId: null,
      type: 'ADMIN_ADJUSTMENT',
      delta: 3,
      quantityAfter: 10,
      reason: increase.reason,
      requestId: increase.requestId
    });
    expect(movement.id).toBeGreaterThan(0);
    expect(movement.actor.length).toBeGreaterThan(0);
    expect(movement.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await json<Movement>(await commerce.inventory.adjust(product.id, increase, authenticatedAdmin.token), 201)).toEqual(movement);
    expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(10);
    const decrease = { delta: -10, reason: 'Disposable depletion', requestId: randomUUID() };
    const subtraction = await json<Movement>(await commerce.inventory.adjust(product.id, decrease, authenticatedAdmin.token), 201);
    expect(subtraction).toMatchObject({ delta: -10, quantityAfter: 0, type: 'ADMIN_ADJUSTMENT', requestId: decrease.requestId });
    expect(await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).toMatchObject({ availableQuantity: 0, stockStatus: 'OUT_OF_STOCK' });
    expect((await json<{ stockQuantity: number }>(await commerce.products.getProduct(product.id, commerce.shopper.token))).stockQuantity).toBe(0);
    const history = await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token));
    expect(history.totalElements).toBe(3);
    expect(history.content).toEqual([subtraction, movement, expect.objectContaining({ type: 'INITIAL_STOCK', delta: 7, quantityAfter: 7 })]);
  });

  test('400: rejects zero delta without changing stock or movements', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();

    // When
    const response = await commerce.inventory.adjust(product.id, { delta: 0, reason: 'Invalid adjustment', requestId: randomUUID() }, authenticatedAdmin.token);

    // Then
    expect(await json(response, 400)).toEqual({ deltaNonZero: 'delta must not be zero' });
    expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
    expect((await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(1);
  });

  for (const [status, actor] of [[401, 'anonymous'], [403, 'customer']] as const) {
    test(`${status}: rejects ${actor} adjustments without changing stock`, async ({ commerce, authenticatedAdmin }) => {
      // Given
      const product = await commerce.product();

      // When
      const response = await commerce.inventory.adjust(product.id, { delta: 2, reason: 'Unauthorized change', requestId: randomUUID() }, actor === 'customer' ? commerce.shopper.token : undefined);

      // Then
      expect(await json(response, status)).toEqual({ message: status === 401 ? 'Unauthorized' : 'Access denied' });
      expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
      expect((await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(1);
    });
  }

  test('409: rejects negative resulting stock without recording a movement', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();

    // When
    const response = await commerce.inventory.adjust(product.id, { delta: -8, reason: 'Controlled underflow', requestId: randomUUID() }, authenticatedAdmin.token);

    // Then
    expect(await json(response, 409)).toEqual({ message: 'Insufficient stock' });
    expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(7);
    expect((await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(1);
  });

  test('409: rejects conflicting requestId reuse without applying another adjustment', async ({ commerce, authenticatedAdmin }) => {
    // Given
    const product = await commerce.product();
    const data = { delta: 2, reason: 'First adjustment', requestId: randomUUID() };
    expect((await commerce.inventory.adjust(product.id, data, authenticatedAdmin.token)).status()).toBe(201);

    // When
    const response = await commerce.inventory.adjust(product.id, {
      ...data,
      reason: 'Changed adjustment'
    }, authenticatedAdmin.token);

    // Then
    expect(await json(response, 409)).toEqual({ message: 'requestId already used with different payload' });
    expect((await json<InventoryItem>(await commerce.inventory.get(product.id, authenticatedAdmin.token))).availableQuantity).toBe(9);
    expect((await json<Page<Movement>>(await commerce.inventory.movements(product.id, authenticatedAdmin.token))).totalElements).toBe(2);
  });
});
