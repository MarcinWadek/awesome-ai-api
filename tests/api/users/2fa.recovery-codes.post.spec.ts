import { json } from '../../../support/assertions/http';
import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaChallenge, expectMfaError, expectMfaSession, expectRecoveryCodes } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';
test.describe('POST /api/v1/users/2fa/recovery-codes', () => {
  test.describe.configure({ timeout: 90_000 });

  test('200: replaces recovery codes, rejects the previous set and allows the new set', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    // Given
    const previous = user.recoveryCodes;
    const code = await user.totp.nextCode();

    // When
    const response = await mfaClient.replaceRecoveryCodes({ password: user.user.password, code }, user.token);

    // Then
    user.recoveryCodes = await expectRecoveryCodes(response);
    expect(user.recoveryCodes.every(value => !previous.includes(value)), 'Replacement codes differ from previous codes').toBe(true);
    expect(await json<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
    const rejectedChallenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
    await expectMfaError(await mfaClient.completeSignIn(rejectedChallenge, previous[0]));
    const acceptedChallenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
    const session = await expectMfaSession(await mfaClient.completeSignIn(acceptedChallenge, user.recoveryCodes[0]), user.user, usersClient);
    user.token = session.token;
    expect(await json<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length - 1 });
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    // When
    const response = await mfaClient.replaceRecoveryCodes({ password: 'Example9!', code: '000000' });

    // Then
    await expectMfaError(response);
  });

  test('422: rejects the wrong password and keeps existing recovery codes usable', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    // Given
    const code = await user.totp.nextCode();

    // When
    const response = await mfaClient.replaceRecoveryCodes({ password: `${user.user.password}-wrong`, code }, user.token);

    // Then
    await expectMfaError(response, 422);
    expect(await json<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
    const challenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
    user.token = (await expectMfaSession(await mfaClient.completeSignIn(challenge, user.recoveryCodes[0]), user.user, usersClient)).token;
  });
});
