import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaChallenge, expectMfaError, expectMfaSession, expectRecoveryCodes, mfaJson } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';

test.describe('POST /api/v1/users/2fa/recovery-codes', () => {
  test.describe.configure({ retries: 0, timeout: 90_000 });

  test('200: replaces recovery codes, rejects the previous set and allows the new set', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    const previous = user.recoveryCodes;
    const code = await test.step('Given the current password and a fresh TOTP', () => user.totp.nextCode());
    const response = await test.step('When the owner replaces recovery codes', () => mfaClient.replaceRecoveryCodes({ password: user.user.password, code }, user.token));
    await test.step('Then only the new set works and usage is reflected in status', async () => {
      user.recoveryCodes = await expectRecoveryCodes(response);
      expect(user.recoveryCodes.every(value => !previous.includes(value)), 'Replacement codes differ from previous codes').toBe(true);
      expect(await mfaJson<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
      const rejectedChallenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
      await expectMfaError(await mfaClient.completeSignIn(rejectedChallenge, previous[0]));
      const acceptedChallenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
      const session = await expectMfaSession(await mfaClient.completeSignIn(acceptedChallenge, user.recoveryCodes[0]), user.user, usersClient);
      user.token = session.token;
      expect(await mfaJson<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length - 1 });
    });
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    const response = await test.step('When an anonymous caller replaces codes', () => mfaClient.replaceRecoveryCodes({ password: 'Example9!', code: '000000' }));
    await test.step('Then authentication is required', () => expectMfaError(response));
  });

  test('422: rejects the wrong password and keeps existing recovery codes usable', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    const code = await test.step('Given a fresh TOTP for the owned account', () => user.totp.nextCode());
    const response = await test.step('When the owner supplies the wrong password', () => mfaClient.replaceRecoveryCodes({ password: `${user.user.password}-wrong`, code }, user.token));
    await test.step('Then reauthentication fails without replacing the existing set', async () => {
      await expectMfaError(response, 422);
      expect(await mfaJson<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
      const challenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
      user.token = (await expectMfaSession(await mfaClient.completeSignIn(challenge, user.recoveryCodes[0]), user.user, usersClient)).token;
    });
  });
});
