import { randomUUID } from 'node:crypto';
import { EmailClient } from '../../../clients/email.client';
import { UsersClient } from '../../../clients/users.client';
import { test, expect } from '../../../fixtures/auth.fixture';
import { expectJsonResponse } from '../../../support/assertions/http';
import type { EmailEvent } from '../../../types/email';

test.describe('POST /api/v1/email', () => {
  test.describe.configure({ retries: 0 });
  let emailClient: EmailClient;
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    emailClient = new EmailClient(request);
    usersClient = new UsersClient(request);
  });

  async function readEvents(token: string): Promise<EmailEvent[]> {
    const response = await usersClient.getEmailEvents(token);
    expect(response.status()).toBe(200);
    expectJsonResponse(response);
    const body = await response.json();
    expect(Array.isArray(body), 'Events are an array').toBe(true);
    return body as EmailEvent[];
  }

  test('200: accepts an owned email and records a private event without exposing it to a peer', async ({ authenticatedUser, authenticatedPeer }) => {
    const payload = await test.step('Given fresh owner and peer accounts with empty event lists', async () => {
      expect((await readEvents(authenticatedUser.token)).length).toBe(0);
      expect((await readEvents(authenticatedPeer.token)).length).toBe(0);
      return { to: authenticatedUser.user.email, subject: `Owned test ${randomUUID()}`, message: 'Controlled API test message.' };
    });
    const response = await test.step('When the owner queues an email to its generated recipient', () => emailClient.send(payload, authenticatedUser.token));

    await test.step('Then acceptance is empty 200 and the owner alone sees its masked event metadata', async () => {
      expect(response.status()).toBe(200);
      expect(await response.body()).toHaveLength(0);
      let recorded: EmailEvent[] = [];
      await expect.poll(async () => {
        recorded = await readEvents(authenticatedUser.token);
        return recorded.length;
      }, { timeout: 5000, intervals: [100, 250, 500], message: 'Owned email event is recorded' }).toBe(1);

      const event = recorded[0];
      expect(event.type).toBe('GENERIC');
      // Lifecycle metadata is observed, not proof of SMTP handoff or delivery.
      expect(['QUEUED', 'SENT_TO_SMTP_SINK', 'FAILED'].includes(event.status), 'Known event lifecycle status').toBe(true);
      expect(event.recipientMasked).toBe(`${payload.to[0]}***@example.invalid`);
      expect(Number.isFinite(Date.parse(event.createdAt)), 'Valid created timestamp').toBe(true);
      expect(Number.isFinite(Date.parse(event.updatedAt)) && Date.parse(event.updatedAt) >= Date.parse(event.createdAt), 'Valid updated timestamp').toBe(true);
      expect(event.failureReason === null || typeof event.failureReason === 'string', 'Nullable failure detail').toBe(true);
      expect(Object.keys(event).sort()).toEqual(['createdAt', 'failureReason', 'recipientMasked', 'status', 'type', 'updatedAt']);
      expect((await readEvents(authenticatedPeer.token)).length).toBe(0);
    });
  });

  test('400: rejects an invalid recipient without creating an event', async ({ authenticatedUser }) => {
    await test.step('Given the owner has no email events', async () => {
      expect((await readEvents(authenticatedUser.token)).length).toBe(0);
    });
    const response = await test.step('When an authenticated caller submits an invalid recipient', () => emailClient.send({
      to: 'not-an-email', subject: 'Validation test', message: 'Controlled validation input.',
    }, authenticatedUser.token));
    await test.step('Then recipient validation fails and no event is recorded', async () => {
      expect(response.status()).toBe(400);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ to: 'Invalid email format' });
      expect((await readEvents(authenticatedUser.token)).length).toBe(0);
    });
  });

  test('401: requires authentication', async () => {
    const response = await test.step('When an anonymous caller sends an otherwise valid message', () => emailClient.send({
      to: `anonymous-${randomUUID()}@example.invalid`, subject: 'Authorization test', message: 'Controlled authorization input.',
    }));
    await test.step('Then authentication is required', async () => {
      expect(response.status()).toBe(401);
      expectJsonResponse(response);
      expect(await response.json()).toEqual({ message: 'Unauthorized' });
    });
  });
});
