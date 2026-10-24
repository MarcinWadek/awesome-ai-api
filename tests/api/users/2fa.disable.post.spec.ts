import { json } from '../../../support/assertions/http';
import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaChallenge, expectMfaError, expectMfaSession } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';
test.describe('POST /api/v1/users/2fa/disable', () => {
  test.describe.configure({ timeout: 90_000 });

  test('200: disables MFA, revokes refresh tokens and restores password-only login', async ({ mfaClient, authClient, usersClient, enrolledUser: user }) => {
    // Given
    const challenge = await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
    const session = await expectMfaSession(await mfaClient.completeSignIn(challenge, user.recoveryCodes[0]), user.user, usersClient);
    user.token = session.token;

    // When
    const response = await mfaClient.disable({ password: user.user.password, code: user.recoveryCodes[1] }, user.token);

    // Then
    expect(response.status()).toBe(200);
    expect(await response.body()).toHaveLength(0);
    expect(await json<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: false, unusedRecoveryCodes: 0 });
    await expectMfaError(await authClient.refresh({ refreshToken: session.refreshToken }));
    user.token = (await expectMfaSession(await authClient.signIn({ username: user.user.username, password: user.user.password }), user.user, usersClient)).token;
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    // When
    const response = await mfaClient.disable({ password: 'Example9!', code: '000000' });

    // Then
    await expectMfaError(response);
  });

  test('401: rejects an invalid factor and keeps MFA required', async ({ mfaClient, authClient, enrolledUser: user }) => {
    // When
    const response = await mfaClient.disable({ password: user.user.password, code: user.totp.invalidCode() }, user.token);

    // Then
    await expectMfaError(response);
    expect(await json<MfaStatus>(await mfaClient.status(user.token))).toEqual({ enabled: true, unusedRecoveryCodes: user.recoveryCodes.length });
    await expectMfaChallenge(await authClient.signIn({ username: user.user.username, password: user.user.password }));
  });
});
