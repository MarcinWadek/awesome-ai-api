import { expect } from '@playwright/test';
import type { EmailEvent } from '../../types/email';

export function expectGenericEmailEvent(event: EmailEvent, recipient: string): void {
  expect(event.type).toBe('GENERIC');
  // Lifecycle metadata is observed, not proof of SMTP handoff or delivery.
  expect(['QUEUED', 'SENT_TO_SMTP_SINK', 'FAILED'].includes(event.status), 'Known event lifecycle status').toBe(true);
  expect(event.recipientMasked).toBe(`${recipient[0]}***@example.invalid`);
  expect(Number.isFinite(Date.parse(event.createdAt)), 'Valid created timestamp').toBe(true);
  expect(Number.isFinite(Date.parse(event.updatedAt)) && Date.parse(event.updatedAt) >= Date.parse(event.createdAt), 'Valid updated timestamp').toBe(true);
  expect(event.failureReason === null || typeof event.failureReason === 'string', 'Nullable failure detail').toBe(true);
  expect(Object.keys(event).sort()).toEqual(['createdAt', 'failureReason', 'recipientMasked', 'status', 'type', 'updatedAt']);
}
