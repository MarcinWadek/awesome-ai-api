import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaError, expectRecoveryCodes, mfaJson } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';

test.describe('POST /api/v1/users/2fa/confirm', () => {
  test.describe.configure({ retries: 0, timeout: 90_000 });

  test('200: enables MFA, creates unique recovery codes and revokes existing refresh tokens', async ({ mfaClient, authClient, pendingUser }) => {
    const code = await test.step('Given a current code from the owned authenticator', () => pendingUser.totp.nextCode());
    const response = await test.step('When the owner confirms enrollment', () => mfaClient.confirm(code, pendingUser.token));
    await test.step('Then enrollment persists, recovery codes are returned and the previous refresh is rejected', async () => {
      pendingUser.recoveryCodes = await expectRecoveryCodes(response);
      expect(await mfaJson<MfaStatus>(await mfaClient.status(pendingUser.token))).toEqual({ enabled: true, unusedRecoveryCodes: pendingUser.recoveryCodes.length });
      await expectMfaError(await authClient.refresh({ refreshToken: pendingUser.initialRefreshToken }));
    });
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    const response = await test.step('When an anonymous caller confirms enrollment', () => mfaClient.confirm('000000'));
    await test.step('Then authentication is required', () => expectMfaError(response));
  });

  test('401: rejects an invalid authenticator code and preserves disabled status', async ({ mfaClient, pendingUser }) => {
    const response = await test.step('When the owner confirms with a nonmatching six-digit code', () => mfaClient.confirm(pendingUser.totp.invalidCode(), pendingUser.token));
    await test.step('Then the factor is rejected without activating MFA or issuing recovery codes', async () => {
      await expectMfaError(response);
      expect(await mfaJson<MfaStatus>(await mfaClient.status(pendingUser.token))).toEqual({ enabled: false, unusedRecoveryCodes: 0 });
    });
  });
});
