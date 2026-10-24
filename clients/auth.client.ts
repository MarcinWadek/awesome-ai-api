import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ForgotPasswordRequest, LoginRequest, RefreshTokenRequest, ResetPasswordRequest, SsoExchangeRequest } from '../types/auth';
import type { RegistrationRequest } from '../types/registration';
import { safeRequest } from '../support/safe-request';

const signInPath = '/api/v1/users/signin';

/** HTTP client for authentication endpoints. */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async signUp(data: Partial<RegistrationRequest>): Promise<APIResponse> {
    return safeRequest('Register user', () => this.request.post('/api/v1/users/signup', { data }));
  }

  async signIn(
    credentials: Partial<LoginRequest>,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return safeRequest('Sign in', () => this.request.post(signInPath, {
      data: credentials,
      headers,
    }));
  }

  async exchangeSsoToken(data: Partial<SsoExchangeRequest>): Promise<APIResponse> {
    return safeRequest('Exchange SSO ID token', () => this.request.post('/api/v1/users/sso/exchange', { data }));
  }

  async forgotPassword(data: Partial<ForgotPasswordRequest>): Promise<APIResponse> {
    return safeRequest('Request password reset', () => this.request.post('/api/v1/users/password/forgot', { data }));
  }

  async resetPassword(data: Partial<ResetPasswordRequest>): Promise<APIResponse> {
    return safeRequest('Reset password', () => this.request.post('/api/v1/users/password/reset', { data }));
  }

  async refresh(
    data: Partial<RefreshTokenRequest>,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.request.post('/api/v1/users/refresh', { data, headers });
  }

  async logout(token?: string): Promise<APIResponse> {
    return this.request.post('/api/v1/users/logout', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }
}
