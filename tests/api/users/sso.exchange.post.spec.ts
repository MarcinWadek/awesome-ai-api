import { AuthClient } from '../../../clients/auth.client';
import { test, expect } from '../../../fixtures/auth.fixture';
import { expectJsonResponse } from '../../../support/assertions/http';

test.describe('POST /api/v1/users/sso/exchange', () => {
  test.describe.configure({ retries: 0 });
  let authClient: AuthClient;

  test.beforeEach(({ request }) => {
    authClient = new AuthClient(request);
  });

  test('400: requires an ID token on the public exchange endpoint', async () => {
    const response = await test.step('When a public exchange request omits the ID token', () => authClient.exchangeSsoToken({}));
    await test.step('Then validation identifies the missing token', async () => {
      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      const body = await response.json();
      expect(typeof body.idToken === 'string' && body.idToken.trim().length > 0, 'ID-token validation message').toBe(true);
      expect(Object.keys(body)).toEqual(['idToken']);
    });
  });

  test('404: refuses exchange because SSO is disabled on the configured deployment', async () => {
    const response = await test.step('When a nonblank synthetic ID token is exchanged without an app JWT', () =>
      authClient.exchangeSsoToken({ idToken: 'invalid-oidc-id-token' }),
    );
    await test.step('Then the exact disabled-SSO policy is returned without session credentials', async () => {
      expect(response.status()).toBe(404);
      expectJsonResponse(response);
      const body = await response.json();
      expect(body.message === 'SSO login is disabled', 'Configured SSO-disabled response').toBe(true);
      expect(Object.keys(body)).toEqual(['message']);
    });
  });
});
