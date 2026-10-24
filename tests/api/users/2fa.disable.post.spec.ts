import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaChallenge, expectMfaError, expectMfaSession, mfaJson } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';

test.describe('POST /api/v1/users/2fa/disable', () => {
  test.describe.configure({ retries: 0, timeout: 90_000 });

  test('200: disables MFA, revokes refresh tokens and restores password-only login', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    const session = await test.step('Given a session issued after completing MFA', async () => {
      const challenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
      return expectMfaSession(await mfaClient.completeSignIn(challenge, user.recoveryCodes[0]), user.user, usersClient);
    });
    user.token = session.token;
    const response = await test.step('When the owner disables MFA with password and an unused recovery code', () => mfaClient.disable({ password: user.user.password, code: user.recoveryCodes[1] }, user.token));
    await test.step('Then disabled status persists, refresh is revoked and password-only login returns a usable session', async () => {
      expect(response.status()).toBe(200);
      expect(await response.body()).toHaveLength(0);
      expect(await mfaJson<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: false, unusedRecoveryCodes: 0 });
      await expectMfaError(await authClient.refresh({ refreshToken: session.refreshToken }));
      user.token = (await expectMfaSession(await authClient.signIn({ username: user.user.username, password: user.user.password }), user.user, usersClient)).token;
    });
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    const response = await test.step('When an anonymous caller disables MFA', () => mfaClient.disable({ password: 'Example9!', code: '000000' }));
    await test.step('Then authentication is required', () => expectMfaError(response));
  });

  test('401: rejects an invalid factor and keeps MFA required', async ({ mfaClient, authClient, enrolledUser: user }) => {
    const response = await test.step('When the owner supplies a correct password but invalid factor', () => mfaClient.disable({ password: user.user.password, code: user.totp.invalidCode() }, user.token));
    await test.step('Then MFA and unused codes remain intact and password alone still yields only a challenge', async () => {
      await expectMfaError(response);
      expect(await mfaJson<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
      await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
    });
  });
});
