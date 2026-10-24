import { json } from '../../../support/assertions/http';
import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaError, expectRecoveryCodes } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';
test.describe('POST /api/v1/users/2fa/confirm', () => {
  test.describe.configure({ timeout: 90_000 });

  test('200: enables MFA, creates unique recovery codes and revokes existing refresh tokens', async ({ mfaClient, authClient, pendingUser }) => {
    // Given
    const code = await pendingUser.totp.nextCode();

    // When
    const response = await mfaClient.confirm(code, pendingUser.token);

    // Then
    pendingUser.recoveryCodes = await expectRecoveryCodes(response);
    expect(await json<MfaStatus>(await mfaClient.status(pendingUser.token))).toEqual({ enabled: true, unusedRecoveryCodes: pendingUser.recoveryCodes.length });
    await expectMfaError(await authClient.refresh({ refreshToken: pendingUser.initialRefreshToken }));
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    // When
    const response = await mfaClient.confirm('000000');

    // Then
    await expectMfaError(response);
  });

  test('401: rejects an invalid authenticator code and preserves disabled status', async ({ mfaClient, pendingUser }) => {
    // When
    const response = await mfaClient.confirm(pendingUser.totp.invalidCode(), pendingUser.token);

    // Then
    await expectMfaError(response);
    expect(await json<MfaStatus>(await mfaClient.status(pendingUser.token))).toEqual({ enabled: false, unusedRecoveryCodes: 0 });
  });
});
