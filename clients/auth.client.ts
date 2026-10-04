import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { LoginRequest } from '../types/auth';
import type { RegistrationRequest } from '../types/registration';

const signInPath = '/api/v1/users/signin';

/** HTTP client for authentication endpoints. */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async signUp(data: Partial<RegistrationRequest>): Promise<APIResponse> {
    return this.request.post('/api/v1/users/signup', { data });
  }

  async signIn(
    credentials: Partial<LoginRequest>,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.request.post(signInPath, {
      data: credentials,
      headers,
    });
  }
}
