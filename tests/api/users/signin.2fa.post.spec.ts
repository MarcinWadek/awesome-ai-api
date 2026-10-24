import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaChallenge, expectMfaError, expectMfaSession, mfaJson } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';

test.describe('POST /api/v1/users/signin/2fa', () => {
  test.describe.configure({ retries: 0, timeout: 90_000 });

  test('200: completes TOTP login and rejects challenge and factor replay', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    const challenge = await test.step('Given password verification returns only an MFA challenge', async () => expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password })));
    const code = await test.step('Given a fresh time step after enrollment confirmation', () => user.totp.nextCode());
    const response = await test.step('When the second factor completes the challenge', () => mfaClient.completeSignIn(challenge, code));
    await test.step('Then the session is usable and the challenge cannot consume another factor', async () => {
      const session = await expectMfaSession(response, user.user, usersClient);
      user.token = session.token;
      // An unused recovery code isolates challenge replay from TOTP reuse.
      await expectMfaError(await mfaClient.completeSignIn(challenge, user.recoveryCodes[0]));
      const freshChallenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
      await expectMfaError(await mfaClient.completeSignIn(freshChallenge, code));
      expect(await mfaJson<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
    });
  });

  test('200: consumes a recovery code once and rejects it on a new challenge', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    const challenge = await test.step('Given a password-only MFA challenge', async () => expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password })));
    const response = await test.step('When a recovery code completes sign-in', () => mfaClient.completeSignIn(challenge, user.recoveryCodes[0]));
    await test.step('Then the session works, the unused count decreases once and reuse fails', async () => {
      user.token = (await expectMfaSession(response, user.user, usersClient)).token;
      const expected = { enabled: true, unusedRecoveryCodes: user.recoveryCodes.length - 1 };
      expect(await mfaJson<MfaStatus>(await mfaClient.status(user.token))).toEqual(expected);
      const nextChallenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
      await expectMfaError(await mfaClient.completeSignIn(nextChallenge, user.recoveryCodes[0]));
      expect(await mfaJson<MfaStatus>(await mfaClient.status(user.token))).toEqual(expected);
    });
  });

  test('401: rejects an invalid factor without issuing a session or consuming recovery codes', async ({ mfaClient, authClient, enrolledUser: user }) => {
    const challenge = await test.step('Given a password-verified challenge', async () => expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password })));
    const response = await test.step('When a nonmatching factor is submitted', () => mfaClient.completeSignIn(challenge, user.totp.invalidCode()));
    await test.step('Then access is rejected and MFA state is unchanged', async () => {
      await expectMfaError(response);
      expect(await mfaJson<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
    });
  });
});
