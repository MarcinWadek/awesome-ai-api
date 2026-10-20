import type { APIRequestContext, APIResponse } from '@playwright/test';
import { safeRequest } from '../support/safe-request';
import type { QrCreateRequest } from '../types/qr';

export class QrClient {
  constructor(private readonly request: APIRequestContext) {}

  createQr(data: QrCreateRequest, token?: string): Promise<APIResponse> {
    return safeRequest('Create QR code', () => this.request.post('/api/v1/qr/create', {
      data,
      headers: {
        Accept: 'image/png, application/json',
        ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
      },
    }));
  }
}
