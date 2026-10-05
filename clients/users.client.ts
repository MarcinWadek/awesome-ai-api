import type { APIRequestContext, APIResponse } from '@playwright/test';

export class UsersClient {
  constructor(private readonly request: APIRequestContext) {}

  async getMe(token?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/users/me', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }

  async forgetUser(username: string, token: string): Promise<APIResponse> {
    return this.request.delete(
      `/api/v1/users/${encodeURIComponent(username)}/right-to-be-forgotten`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}
