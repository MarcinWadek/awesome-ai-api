import { randomUUID } from 'node:crypto';
import { test, expect } from '../../../fixtures/auth.fixture';
import { json } from '../../../support/assertions/http';
import type { ForgotPasswordResponse } from '../../../types/auth';
test.describe('POST /api/v1/users/password/forgot', () => {
  test('202: returns the same generic response for known and unknown accounts without exposing a token', async ({ authenticatedUser, authClient }) => {
    // Given
    const unknownUsername = `absent_${randomUUID()}`;

    // When
    const known = await authClient.forgotPassword({ identifier: authenticatedUser.user.username });
    const unknown = await authClient.forgotPassword({ identifier: unknownUsername });

    // Then
    const messages: string[] = [];

    for (const response of [known, unknown]) {
      const body = await json<ForgotPasswordResponse>(response, 202);
      // A regression must not print an unexpectedly exposed reset credential.
      expect(body.message === 'If the account exists, password reset instructions have been sent.', 'Generic recovery message').toBe(true);
      expect(body.token === null, 'Reset-token echo must be disabled on this deployment').toBe(true);
      expect(Object.keys(body).sort()).toEqual(['message', 'token']);
      messages.push(body.message);
    }
    expect(messages[0] === messages[1], 'Responses must not reveal whether the account exists').toBe(true);
  });

  test('400: requires an account identifier', async ({ authClient }) => {
    // When
    const response = await authClient.forgotPassword({});

    // Then
    expect(await json(response, 400)).toEqual({ identifier: 'Identifier is required' });
  });
});
