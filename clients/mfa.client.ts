import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { MfaProtectedAction } from '../types/mfa';
import { safeRequest } from '../support/safe-request';

export class MfaClient {
  constructor(private readonly request: APIRequestContext) {}

  async status(token?: string): Promise<APIResponse> {
    return safeRequest('Read MFA status', () => this.request.get('/api/v1/users/2fa/status', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async setup(token?: string): Promise<APIResponse> {
    return safeRequest('Start MFA setup', () => this.request.post('/api/v1/users/2fa/setup', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async confirm(code: string, token?: string): Promise<APIResponse> {
    return safeRequest('Confirm MFA setup', () => this.request.post('/api/v1/users/2fa/confirm', {
      data: { code },
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async completeSignIn(challengeToken: string, code: string): Promise<APIResponse> {
    return safeRequest('Complete MFA sign-in', () => this.request.post('/api/v1/users/signin/2fa', {
      data: { challengeToken, code },
    }));
  }

  async replaceRecoveryCodes(data: MfaProtectedAction, token?: string): Promise<APIResponse> {
    return safeRequest('Replace MFA recovery codes', () => this.request.post('/api/v1/users/2fa/recovery-codes', {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async disable(data: MfaProtectedAction, token?: string): Promise<APIResponse> {
    return safeRequest('Disable MFA', () => this.request.post('/api/v1/users/2fa/disable', {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }
}
