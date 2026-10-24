import { AuthClient } from '../clients/auth.client';
import { MfaClient } from '../clients/mfa.client';
import { UsersClient } from '../clients/users.client';
import { generateRegistrationData } from '../generators/registration.generator';
import type { RegistrationRequest } from '../types/registration';
import type { LoginResponse } from '../types/auth';
import type { MfaSetup } from '../types/mfa';
import { TotpAuthenticator } from '../support/totp';
import { expectMfaChallenge, expectMfaSetup, expectRecoveryCodes, mfaJson } from '../support/assertions/mfa';
import { test as authTest, expect } from './auth.fixture';

export interface MfaUser {
  user: RegistrationRequest;
  token: string;
  initialRefreshToken: string;
  setup?: MfaSetup;
  totp?: TotpAuthenticator;
  recoveryCodes: string[];
}

export interface ProvisionedMfaUser extends MfaUser {
  setup: MfaSetup;
  totp: TotpAuthenticator;
}

function sessionToken(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('MFA fixture requires a usable session credential');
  return value;
}

export const test = authTest.extend<{
  mfaClient: MfaClient;
  authClient: AuthClient;
  usersClient: UsersClient;
  mfaUser: MfaUser;
  pendingUser: ProvisionedMfaUser;
  enrolledUser: ProvisionedMfaUser;
}>({
  mfaClient: async ({ request }, use) => use(new MfaClient(request)),
  authClient: async ({ request }, use) => use(new AuthClient(request)),
  usersClient: async ({ request }, use) => use(new UsersClient(request)),
  mfaUser: async ({ authenticatedUser, authClient, usersClient, mfaClient }, use) => {
    // The dependency keeps an ordinary observer alive until MFA teardown ends.
    const user = generateRegistrationData();
    let registered = false;
    let account: MfaUser | undefined;
    let primaryError: unknown;

    async function signIn(): Promise<string> {
      const response = await authClient.signIn({ username: user.username, password: user.password });
      const body = await mfaJson<LoginResponse>(response);
      if (!body.mfaRequired) return sessionToken(body.token);
      const challenge = await expectMfaChallenge(response);
      if (!account?.totp) throw new Error('MFA cleanup requires the owned authenticator');
      const code = await account.totp.nextCode();
      const completed = await mfaJson<LoginResponse>(await mfaClient.completeSignIn(challenge, code));
      return sessionToken(completed.token);
    }

    try {
      await test.step('Given an owned account for MFA testing', async () => {
        const response = await authClient.signUp(user);
        registered = response.status() === 201;
        expect(response.status()).toBe(201);
        const login = await mfaJson<LoginResponse>(await authClient.signIn({ username: user.username, password: user.password }));
        account = { user, token: sessionToken(login.token), initialRefreshToken: sessionToken(login.refreshToken), recoveryCodes: [] };
      });
      await use(account!);
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      if (registered) {
        try {
          await test.step('Delete the owned MFA account and verify absence through the observer', async () => {
            const before = await usersClient.getUser(user.username, authenticatedUser.token);
            if (before.status() === 404) return;
            expect(before.status()).toBe(200);
            let token = account?.token ?? await signIn();
            let response = await usersClient.forgetUser(user.username, token);
            if (response.status() === 401) {
              token = await signIn();
              response = await usersClient.forgetUser(user.username, token);
            }
            const after = await usersClient.getUser(user.username, authenticatedUser.token);
            expect(response.status()).toBe(204);
            expect(after.status()).toBe(404);
          });
        } catch (cleanupError) {
          const message = 'Failed to clean up the owned MFA account';
          if (primaryError !== undefined) throw new AggregateError([primaryError, cleanupError], message);
          throw new Error(message, { cause: cleanupError });
        }
      }
    }
  },
  pendingUser: async ({ mfaUser, mfaClient }, use) => {
    await test.step('Given a pending MFA setup on the owned account', async () => {
      const { setup, totp } = await expectMfaSetup(await mfaClient.setup(mfaUser.token), mfaUser.user.username);
      // Retain the authenticator before confirming, including for lost responses.
      mfaUser.setup = setup;
      mfaUser.totp = totp;
    });
    await use(mfaUser as ProvisionedMfaUser);
  },
  enrolledUser: async ({ pendingUser, mfaClient }, use) => {
    await test.step('Given MFA enrollment is confirmed', async () => {
      pendingUser.recoveryCodes = await expectRecoveryCodes(await mfaClient.confirm(await pendingUser.totp.nextCode(), pendingUser.token));
    });
    await use(pendingUser);
  },
});

export { expect };
