import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { EmailRequest } from '../types/email';
import { safeRequest } from '../support/safe-request';

export class EmailClient {
  constructor(private readonly request: APIRequestContext) {}

  async send(data: EmailRequest, token?: string): Promise<APIResponse> {
    return safeRequest('Send owned email', () => this.request.post('/api/v1/email', {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }
}
