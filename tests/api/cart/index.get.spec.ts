import type { ApiErrorResponse } from '../../../types/auth';
import { test } from '../../../fixtures/auth.fixture';
import { expectEmptyCart } from '../../../support/assertions/cart';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
test.describe('GET /api/v1/cart', () => {
  test('200: returns an empty cart for a newly registered user', async ({ authenticatedUser, cartClient }) => {
    // When
    const response = await cartClient.getCart(authenticatedUser.token);

    // Then
    expectEmptyCart(await json(response), authenticatedUser.user.username);
  });

  test('401: rejects missing authentication', async ({ cartClient }) => {
    // When
    const response = await cartClient.getCart();

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
  });
});
