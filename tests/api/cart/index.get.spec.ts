import { CartClient } from '../../../clients/cart.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectEmptyCart } from '../../../support/assertions/cart';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';

test.describe('GET /api/v1/cart', () => {
  test.describe.configure({ retries: 0 });
  let cartClient: CartClient;

  test.beforeEach(({ request }) => {
    cartClient = new CartClient(request);
  });

  test.describe('200', () => {
    test('returns an empty cart for a newly registered user', async ({ authenticatedUser }) => {
      const response = await test.step('When a new user reads its cart', () => cartClient.getCart(authenticatedUser.token));
      await test.step('Then the 200 JSON cart identifies its owner and has zero totals', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        expectEmptyCart(await response.json(), authenticatedUser.user.username);
      });
    });

  });

  test.describe('401', () => {
    test('rejects missing authentication', async () => {
      const response = await test.step('When a cart is read without authentication', () =>
        cartClient.getCart(),
      );
      await test.step('Then the response is a 401 JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
    });
  });
});
