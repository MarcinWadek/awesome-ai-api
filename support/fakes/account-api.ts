import type { APIResponse } from '@playwright/test';
import type { RegistrationRequest } from '../../types/registration';

export function fakeResponse(status: number, body: unknown = {}): APIResponse {
  const partial: Partial<APIResponse> = {
    status: () => status,
    headers: () => ({ 'content-type': 'application/json' }),
    json: async () => body,
  };
  return partial as APIResponse;
}

export function createAccountApi() {
  const state = { exists: false, deletedTokens: [] as (string | undefined)[], reads: 0, logins: 0 };
  const authClient = {
    signUp: async (_user: RegistrationRequest) => {
      state.exists = true;
      return fakeResponse(201);
    },
    signIn: async () => {
      state.logins++;
      return state.exists
        ? fakeResponse(200, { token: 'test-access', refreshToken: 'test-refresh', roles: ['ROLE_CLIENT'] })
        : fakeResponse(401);
    },
  };
  const usersClient = {
    getUser: async (_username: string, _token?: string) => {
      state.reads++;
      return fakeResponse(state.exists ? 200 : 404);
    },
    forgetUser: async (_username: string, token?: string) => {
      state.deletedTokens.push(token);
      state.exists = false;
      return fakeResponse(204);
    },
  };
  return { state, authClient, usersClient };
}

