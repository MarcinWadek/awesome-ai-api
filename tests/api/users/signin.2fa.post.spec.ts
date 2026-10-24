import { json } from '../../../support/assertions/http';
import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaChallenge, expectMfaError, expectMfaSession } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';
test.describe('POST /api/v1/users/signin/2fa', () => {
  test.describe.configure({ timeout: 90_000 });

  test('200: completes TOTP login and rejects challenge and factor replay', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    // Given
    const challenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
    const code = await user.totp.nextCode();

    // When
    const response = await mfaClient.completeSignIn(challenge, code);

    // Then
    const session = await expectMfaSession(response, user.user, usersClient);
    user.token = session.token;
    // An unused recovery code isolates challenge replay from TOTP reuse.
    await expectMfaError(await mfaClient.completeSignIn(challenge, user.recoveryCodes[0]));
    const freshChallenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
    await expectMfaError(await mfaClient.completeSignIn(freshChallenge, code));
    expect(await json<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
  });

  test('200: consumes a recovery code once and rejects it on a new challenge', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    // Given
    const challenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));

    // When
    const response = await mfaClient.completeSignIn(challenge, user.recoveryCodes[0]);

    // Then
    user.token = (await expectMfaSession(response, user.user, usersClient)).token;
    const expected = { enabled: true, unusedRecoveryCodes: user.recoveryCodes.length - 1 };
    expect(await json<MfaStatus>(await mfaClient.status(user.token))).toEqual(expected);
    const nextChallenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
    await expectMfaError(await mfaClient.completeSignIn(nextChallenge, user.recoveryCodes[0]));
    expect(await json<MfaStatus>(await mfaClient.status(user.token))).toEqual(expected);
  });

  test('401: rejects an invalid factor without issuing a session or consuming recovery codes', async ({ mfaClient, authClient, enrolledUser: user }) => {
    // Given
    const challenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));

    // When
    const response = await mfaClient.completeSignIn(challenge, user.totp.invalidCode());

    // Then
    await expectMfaError(response);
    expect(await json<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
  });
});
