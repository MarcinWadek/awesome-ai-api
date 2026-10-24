import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaError, mfaJson } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';

test.describe('GET /api/v1/users/2fa/status', () => {
  test.describe.configure({ retries: 0, timeout: 90_000 });

  test('200: reports disabled MFA and no recovery codes for a fresh account', async ({ mfaClient, mfaUser }) => {
    const response = await test.step('When the new account reads its MFA status', () => mfaClient.status(mfaUser.token));
    await test.step('Then MFA is disabled and no recovery codes exist', async () => {
      expect(await mfaJson<MfaStatus>(response)).toEqual({ enabled: false, unusedRecoveryCodes: 0 });
    });
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    const response = await test.step('When an anonymous caller reads MFA status', () => mfaClient.status());
    await test.step('Then authentication is required', () => expectMfaError(response));
  });
});
