import { test, expect } from '@playwright/test';
import { useRegisteredUser } from '../../support/registered-user';
import { createAccountApi, fakeResponse } from '../../support/fakes/account-api';

test('cleans up after consuming code fails and preserves that failure', async () => {
  const api = createAccountApi();
  const failure = new Error('Consumer failed');
  await expect(useRegisteredUser(api, async () => { throw failure; })).rejects.toBe(failure);
  expect(api.state.exists).toBe(false);
  expect(api.state.deletedTokens).toEqual(['test-access']);
});

test('recovers an account whose signup response was lost', async () => {
  const api = createAccountApi();
  const failure = new Error('Signup response lost');
  api.authClient.signUp = async () => { api.state.exists = true; throw failure; };
  await expect(useRegisteredUser(api, async () => { throw new Error('Must not consume'); })).rejects.toBe(failure);
  expect(api.state.exists).toBe(false);
  expect(api.state.deletedTokens).toHaveLength(1);
});

test('does not attempt deletion when failed signup created no account', async () => {
  const api = createAccountApi();
  const failure = new Error('Signup did not reach server');
  api.authClient.signUp = async () => { throw failure; };
  await expect(useRegisteredUser(api, async () => {})).rejects.toBe(failure);
  expect(api.state.deletedTokens).toEqual([]);
});

test('retains the access token when refresh-token validation fails', async () => {
  const api = createAccountApi();
  api.authClient.signIn = async () => fakeResponse(200, { token: 'test-access', refreshToken: null });
  await expect(useRegisteredUser(api, async () => {})).rejects.toThrow('session credential');
  expect(api.state.exists).toBe(false);
  expect(api.state.deletedTokens).toEqual(['test-access']);
});

test('renews a rejected cleanup token once', async () => {
  const api = createAccountApi();
  const remove = api.usersClient.forgetUser;
  let attempts = 0;
  api.usersClient.forgetUser = async (username, token) => {
    if (++attempts === 1) return fakeResponse(401);
    return remove(username, token);
  };
  await useRegisteredUser(api, async () => {});
  expect(attempts).toBe(2);
  expect(api.state.logins).toBe(2);
  expect(api.state.exists).toBe(false);
});

test('stops retrying when renewed cleanup credentials are also rejected', async () => {
  const api = createAccountApi();
  let attempts = 0;
  api.usersClient.forgetUser = async () => { attempts++; return fakeResponse(401); };
  await expect(useRegisteredUser(api, async () => {})).rejects.toThrow('Failed to clean up');
  expect(attempts).toBe(2);
  expect(api.state.exists).toBe(true);
});

test('uses the current token when the consuming scenario replaces its session', async () => {
  const api = createAccountApi();
  await useRegisteredUser(api, async account => { account.token = 'replacement-session'; });
  expect(api.state.deletedTokens).toEqual(['replacement-session']);
});

test('uses specialized MFA renewal when cleanup needs a fresh token', async () => {
  const api = createAccountApi();
  const remove = api.usersClient.forgetUser;
  api.usersClient.forgetUser = async (username, token) => token === 'mfa-session'
    ? remove(username, token) : fakeResponse(401);
  let renewals = 0;
  await useRegisteredUser(api, async () => {}, {
    renewToken: async () => { renewals++; return 'mfa-session'; },
  });
  expect(renewals).toBe(1);
  expect(api.state.deletedTokens).toEqual(['mfa-session']);
});

test('allows an account already deleted by its lifecycle test', async () => {
  const api = createAccountApi();
  await useRegisteredUser(api, async () => { api.state.exists = false; }, { observerToken: 'observer' });
  expect(api.state.reads).toBe(1);
  expect(api.state.deletedTokens).toEqual([]);
});

test('detects a successful deletion response that left the account present', async () => {
  const api = createAccountApi();
  api.usersClient.forgetUser = async () => fakeResponse(204);
  await expect(useRegisteredUser(api, async () => {}, { observerToken: 'observer' }))
    .rejects.toThrow('Failed to clean up');
  expect(api.state.reads).toBe(2);
  expect(api.state.exists).toBe(true);
});

test('preserves account and orders when inventory restoration fails', async () => {
  const api = createAccountApi();
  await expect(useRegisteredUser(api, async () => {}, {
    beforeDelete: async () => { throw new Error('Stock restoration failed'); },
  })).rejects.toThrow('Failed to clean up');
  expect(api.state.exists).toBe(true);
  expect(api.state.deletedTokens).toEqual([]);
});

test('reports both the consuming failure and cleanup failure', async () => {
  const api = createAccountApi();
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
