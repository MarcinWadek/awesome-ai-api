import type { LoginResponse } from '../types/auth';
import type { RegistrationRequest } from '../types/registration';
import type { MfaSetup } from '../types/mfa';
import { TotpAuthenticator } from '../support/totp';
import { expectMfaChallenge, expectMfaSetup, expectRecoveryCodes, mfaJson } from '../support/assertions/mfa';
import { test as authTest } from './auth.fixture';
import { useRegisteredUser, requireSessionToken, type AuthenticatedUser } from '../support/registered-user';

export interface MfaUser extends AuthenticatedUser {
  initialRefreshToken: string;
  setup?: MfaSetup;
  totp?: TotpAuthenticator;
  recoveryCodes: string[];
}

export interface ProvisionedMfaUser extends MfaUser {
  setup: MfaSetup;
  totp: TotpAuthenticator;
}

export const test = authTest.extend<{
  mfaUser: MfaUser;
  pendingUser: ProvisionedMfaUser;
  enrolledUser: ProvisionedMfaUser;
}>({
  mfaUser: async ({ authenticatedUser, authClient, usersClient, mfaClient }, use) => {
    let account: MfaUser | undefined;

    async function renewSession(user: RegistrationRequest): Promise<string> {
      const response = await authClient.signIn({ username: user.username, password: user.password });
      const body = await mfaJson<LoginResponse>(response);
      if (!body.mfaRequired) return requireSessionToken(body.token);
      const challenge = await expectMfaChallenge(response);
      if (!account?.totp) throw new Error('MFA cleanup requires the owned authenticator');
      const code = await account.totp.nextCode();
      const completed = await mfaJson<LoginResponse>(await mfaClient.completeSignIn(challenge, code));
      return requireSessionToken(completed.token);
    }

    await useRegisteredUser({ authClient, usersClient }, async registeredUser => {
      // Keep the same session object so teardown sees tokens updated by the test.
      account = Object.assign(registeredUser, {
        initialRefreshToken: registeredUser.refreshToken,
        recoveryCodes: [] as string[],
      });
      await use(account);
    }, {
      observerToken: authenticatedUser.token,
      renewToken: renewSession,
    });
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

export { expect } from './auth.fixture';
