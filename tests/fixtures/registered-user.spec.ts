import { test, expect, type APIResponse } from '@playwright/test';
import { useRegisteredUser } from '../../support/registered-user';
import type { RegistrationRequest } from '../../types/registration';

function response(status: number, body: unknown = {}): APIResponse {
  const partial: Partial<APIResponse> = {
    status: () => status,
    headers: () => ({ 'content-type': 'application/json' }),
    json: async () => body,
  };
  return partial as APIResponse;
}

function accountApi() {
  const state = { exists: false, deletedTokens: [] as (string | undefined)[], reads: 0, logins: 0 };
  const authClient = {
    signUp: async (_user: RegistrationRequest) => {
      state.exists = true;
      return response(201);
    },
    signIn: async () => {
      state.logins++;
      return state.exists
        ? response(200, { token: 'test-access', refreshToken: 'test-refresh', roles: ['ROLE_CLIENT'] })
        : response(401);
    },
  };
  const usersClient = {
    getUser: async (_username: string, _token?: string) => {
      state.reads++;
      return response(state.exists ? 200 : 404);
    },
    forgetUser: async (_username: string, token?: string) => {
      state.deletedTokens.push(token);
      state.exists = false;
      return response(204);
    },
  };
  return { state, authClient, usersClient };
}

test('cleans up after consuming code fails and preserves that failure', async () => {
  const api = accountApi();
  const failure = new Error('Consumer failed');
  await expect(useRegisteredUser(api, async () => { throw failure; })).rejects.toBe(failure);
  expect(api.state.exists).toBe(false);
  expect(api.state.deletedTokens).toEqual(['test-access']);
});

test('recovers an account whose signup response was lost', async () => {
  const api = accountApi();
  const failure = new Error('Signup response lost');
  api.authClient.signUp = async () => { api.state.exists = true; throw failure; };
  await expect(useRegisteredUser(api, async () => { throw new Error('Must not consume'); })).rejects.toBe(failure);
  expect(api.state.exists).toBe(false);
  expect(api.state.deletedTokens).toHaveLength(1);
});

test('does not attempt deletion when failed signup created no account', async () => {
  const api = accountApi();
  const failure = new Error('Signup did not reach server');
  api.authClient.signUp = async () => { throw failure; };
  await expect(useRegisteredUser(api, async () => {})).rejects.toBe(failure);
  expect(api.state.deletedTokens).toEqual([]);
});

test('retains the access token when refresh-token validation fails', async () => {
  const api = accountApi();
  api.authClient.signIn = async () => response(200, { token: 'test-access', refreshToken: null });
  await expect(useRegisteredUser(api, async () => {})).rejects.toThrow('session credential');
  expect(api.state.exists).toBe(false);
  expect(api.state.deletedTokens).toEqual(['test-access']);
});

test('renews a rejected cleanup token once', async () => {
  const api = accountApi();
  const remove = api.usersClient.forgetUser;
  let attempts = 0;
  api.usersClient.forgetUser = async (username, token) => {
    if (++attempts === 1) return response(401);
    return remove(username, token);
  };
  await useRegisteredUser(api, async () => {});
  expect(attempts).toBe(2);
  expect(api.state.logins).toBe(2);
  expect(api.state.exists).toBe(false);
});

test('stops retrying when renewed cleanup credentials are also rejected', async () => {
  const api = accountApi();
  let attempts = 0;
  api.usersClient.forgetUser = async () => { attempts++; return response(401); };
  await expect(useRegisteredUser(api, async () => {})).rejects.toThrow('Failed to clean up');
  expect(attempts).toBe(2);
  expect(api.state.exists).toBe(true);
});

test('uses the current token when the consuming scenario replaces its session', async () => {
  const api = accountApi();
  await useRegisteredUser(api, async account => { account.token = 'replacement-session'; });
  expect(api.state.deletedTokens).toEqual(['replacement-session']);
});

test('uses specialized MFA renewal when cleanup needs a fresh token', async () => {
  const api = accountApi();
  const remove = api.usersClient.forgetUser;
  api.usersClient.forgetUser = async (username, token) => token === 'mfa-session'
    ? remove(username, token) : response(401);
  let renewals = 0;
  await useRegisteredUser(api, async () => {}, {
    renewToken: async () => { renewals++; return 'mfa-session'; },
  });
  expect(renewals).toBe(1);
  expect(api.state.deletedTokens).toEqual(['mfa-session']);
});

test('allows an account already deleted by its lifecycle test', async () => {
  const api = accountApi();
  await useRegisteredUser(api, async () => { api.state.exists = false; }, { observerToken: 'observer' });
  expect(api.state.reads).toBe(1);
  expect(api.state.deletedTokens).toEqual([]);
});

test('detects a successful deletion response that left the account present', async () => {
  const api = accountApi();
  api.usersClient.forgetUser = async () => response(204);
  await expect(useRegisteredUser(api, async () => {}, { observerToken: 'observer' }))
    .rejects.toThrow('Failed to clean up');
  expect(api.state.reads).toBe(2);
  expect(api.state.exists).toBe(true);
});

test('preserves account and orders when inventory restoration fails', async () => {
  const api = accountApi();
  await expect(useRegisteredUser(api, async () => {}, {
    beforeDelete: async () => { throw new Error('Stock restoration failed'); },
  })).rejects.toThrow('Failed to clean up');
  expect(api.state.exists).toBe(true);
  expect(api.state.deletedTokens).toEqual([]);
});

test('reports both the consuming failure and cleanup failure', async () => {
  const api = accountApi();
  const primary = new Error('Consumer failed');
  const cleanup = new Error('Cleanup transport failed');
  api.usersClient.forgetUser = async () => { throw cleanup; };
  let failure: unknown;
  try {
    await useRegisteredUser(api, async () => { throw primary; });
  } catch (error) { failure = error; }
  expect(failure).toBeInstanceOf(AggregateError);
  expect((failure as AggregateError).errors).toEqual([primary, cleanup]);
});
