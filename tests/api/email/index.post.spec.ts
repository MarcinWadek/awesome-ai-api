import { randomUUID } from 'node:crypto';
import type { UsersClient } from '../../../clients/users.client';
import { test, expect } from '../../../fixtures/auth.fixture';
import { json } from '../../../support/assertions/http';
import type { EmailEvent } from '../../../types/email';
test.describe('POST /api/v1/email', () => {
  async function readEvents(usersClient: UsersClient, token: string): Promise<EmailEvent[]> {
    const response = await usersClient.getEmailEvents(token);
    const body = await json(response);
    expect(Array.isArray(body), 'Events are an array').toBe(true);
    return body as EmailEvent[];
  }

  test('200: accepts an owned email and records a private event without exposing it to a peer', async ({ authenticatedUser, authenticatedPeer, emailClient, usersClient }) => {
    // Given
    expect((await readEvents(usersClient, authenticatedUser.token)).length).toBe(0);
    expect((await readEvents(usersClient, authenticatedPeer.token)).length).toBe(0);
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
    let recorded: EmailEvent[] = [];
    await expect.poll(async () => {
      recorded = await readEvents(usersClient, authenticatedUser.token);
      return recorded.length;
    }, {
      timeout: 5000,
      intervals: [100, 250, 500],
      message: 'Owned email event is recorded'
    }).toBe(1);
    const event = recorded[0];
    expect(event.type).toBe('GENERIC');
    // Lifecycle metadata is observed, not proof of SMTP handoff or delivery.
    expect(['QUEUED', 'SENT_TO_SMTP_SINK', 'FAILED'].includes(event.status), 'Known event lifecycle status').toBe(true);
    expect(event.recipientMasked).toBe(`${payload.to[0]}***@example.invalid`);
    expect(Number.isFinite(Date.parse(event.createdAt)), 'Valid created timestamp').toBe(true);
    expect(Number.isFinite(Date.parse(event.updatedAt)) && Date.parse(event.updatedAt) >= Date.parse(event.createdAt), 'Valid updated timestamp').toBe(true);
    expect(event.failureReason === null || typeof event.failureReason === 'string', 'Nullable failure detail').toBe(true);
    expect(Object.keys(event).sort()).toEqual(['createdAt', 'failureReason', 'recipientMasked', 'status', 'type', 'updatedAt']);
    expect((await readEvents(usersClient, authenticatedPeer.token)).length).toBe(0);
  });

  test('400: rejects an invalid recipient without creating an event', async ({ authenticatedUser, emailClient, usersClient }) => {
    // Given
    expect((await readEvents(usersClient, authenticatedUser.token)).length).toBe(0);

    // When
    const response = await emailClient.send({ to: 'not-an-email', subject: 'Validation test', message: 'Controlled validation input.' }, authenticatedUser.token);

    // Then
    expect(await json(response, 400)).toEqual({ to: 'Invalid email format' });
    expect((await readEvents(usersClient, authenticatedUser.token)).length).toBe(0);
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
