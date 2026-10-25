import { expect } from '@playwright/test';
import type { UsersClient } from '../../clients/users.client';
import type { EmailEvent } from '../../types/email';
import { json } from '../assertions/http';

export async function readEmailEvents(users: UsersClient, token: string): Promise<EmailEvent[]> {
  const body = await json(await users.getEmailEvents(token));
  expect(Array.isArray(body), 'Events are an array').toBe(true);
  return body as EmailEvent[];
}

export async function waitForEmailEvents(users: UsersClient, token: string, count: number): Promise<EmailEvent[]> {
  let recorded: EmailEvent[] = [];
  await expect.poll(async () => {
    recorded = await readEmailEvents(users, token);
    return recorded.length;
  }, {
    timeout: 5000,
    intervals: [100, 250, 500],
    message: 'Owned email event is recorded',
  }).toBe(count);
  return recorded;
}
