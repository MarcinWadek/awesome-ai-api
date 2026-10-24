import { test, expect } from '../../../fixtures/auth.fixture';
import { json } from '../../../support/assertions/http';
test.describe('POST /api/v1/users/sso/exchange', () => {
  test('400: requires an ID token on the public exchange endpoint', async ({ authClient }) => {
    // When
    const response = await authClient.exchangeSsoToken({});

    // Then
    const body = await json<Record<string, unknown>>(response, 400);
    expect(typeof body.idToken === 'string' && body.idToken.trim().length > 0, 'ID-token validation message').toBe(true);
    expect(Object.keys(body)).toEqual(['idToken']);
  });

  test('404: refuses exchange because SSO is disabled on the configured deployment', async ({ authClient }) => {
    // When
    const response = await authClient.exchangeSsoToken({ idToken: 'invalid-oidc-id-token' });

    // Then
    const body = await json<Record<string, unknown>>(response, 404);
    expect(body.message === 'SSO login is disabled', 'Configured SSO-disabled response').toBe(true);
    expect(Object.keys(body)).toEqual(['message']);
  });
});
