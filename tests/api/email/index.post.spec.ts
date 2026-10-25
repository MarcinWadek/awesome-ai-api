import { randomUUID } from 'node:crypto';
import { readEmailEvents, waitForEmailEvents } from '../../../support/helpers/email';
import { expectGenericEmailEvent } from '../../../support/assertions/email';
import { test, expect } from '../../../fixtures/auth.fixture';
import { json } from '../../../support/assertions/http';
test.describe('POST /api/v1/email', () => {
  test('200: accepts an owned email and records a private event without exposing it to a peer', async ({ authenticatedUser, authenticatedPeer, emailClient, usersClient }) => {
    // Given
    expect((await readEmailEvents(usersClient, authenticatedUser.token)).length).toBe(0);
    expect((await readEmailEvents(usersClient, authenticatedPeer.token)).length).toBe(0);
    const payload = {
      to: authenticatedUser.user.email,
      subject: `Owned test ${randomUUID()}`,
      message: 'Controlled API test message.'
    };

    // When
    const response = await emailClient.send(payload, authenticatedUser.token);

    // Then
    expect(response.status()).toBe(200);
    expect(await response.body()).toHaveLength(0);
    const [event] = await waitForEmailEvents(usersClient, authenticatedUser.token, 1);
    expectGenericEmailEvent(event, payload.to);
    expect((await readEmailEvents(usersClient, authenticatedPeer.token)).length).toBe(0);
  });

  test('400: rejects an invalid recipient without creating an event', async ({ authenticatedUser, emailClient, usersClient }) => {
    // Given
    expect((await readEmailEvents(usersClient, authenticatedUser.token)).length).toBe(0);

    // When
    const response = await emailClient.send({ to: 'not-an-email', subject: 'Validation test', message: 'Controlled validation input.' }, authenticatedUser.token);

    // Then
    expect(await json(response, 400)).toEqual({ to: 'Invalid email format' });
    expect((await readEmailEvents(usersClient, authenticatedUser.token)).length).toBe(0);
  });

  test('401: requires authentication', async ({ emailClient }) => {
    // When
    const response = await emailClient.send({
      to: `anonymous-${randomUUID()}@example.invalid`,
      subject: 'Authorization test',
      message: 'Controlled authorization input.'
    });

    // Then
    expect(await json(response, 401)).toEqual({ message: 'Unauthorized' });
  });
});
