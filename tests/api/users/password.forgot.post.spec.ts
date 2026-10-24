import { randomUUID } from 'node:crypto';
import { AuthClient } from '../../../clients/auth.client';
import { test, expect } from '../../../fixtures/auth.fixture';
import { expectJsonResponse } from '../../../support/assertions/http';
import type { ForgotPasswordResponse } from '../../../types/auth';

test.describe('POST /api/v1/users/password/forgot', () => {
  test.describe.configure({ retries: 0 });
  let authClient: AuthClient;

  test.beforeEach(({ request }) => {
    authClient = new AuthClient(request);
  });

  test('202: returns the same generic response for known and unknown accounts without exposing a token', async ({ authenticatedUser }) => {
    const unknownUsername = await test.step('Given a unique identifier that was never registered', async () => `absent_${randomUUID()}`);
    const known = await test.step('When reset instructions are requested for the owned account without Authorization', () =>
      authClient.forgotPassword({ identifier: authenticatedUser.user.username }),
    );
    const unknown = await test.step('When reset instructions are requested for the unknown identifier without Authorization', () =>
      authClient.forgotPassword({ identifier: unknownUsername }),
    );

    await test.step('Then both responses are accepted and expose the same public message with no raw token', async () => {
      const messages: string[] = [];
      for (const response of [known, unknown]) {
        expect(response.status()).toBe(202);
        expectJsonResponse(response);
        const body = await response.json() as ForgotPasswordResponse;
        // A regression must not print an unexpectedly exposed reset credential.
        expect(body.message === 'If the account exists, password reset instructions have been sent.', 'Generic recovery message').toBe(true);
        expect(body.token === null, 'Reset-token echo must be disabled on this deployment').toBe(true);
        expect(Object.keys(body).sort()).toEqual(['message', 'token']);
        messages.push(body.message);
      }
      expect(messages[0] === messages[1], 'Responses must not reveal whether the account exists').toBe(true);
    });
  });

  test('400: requires an account identifier', async () => {
    const response = await test.step('When an anonymous reset request omits the identifier', () => authClient.forgotPassword({}));
    await test.step('Then validation identifies the missing identifier', async () => {
      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ identifier: 'Identifier is required' });
    });
  });
});
