import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaError, expectMfaSetup, mfaJson } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';

test.describe('POST /api/v1/users/2fa/setup', () => {
  test.describe.configure({ retries: 0, timeout: 90_000 });

  test('200: provisions consistent authenticator data without enabling MFA', async ({ mfaClient, mfaUser }) => {
    const response = await test.step('When the owner starts authenticator enrollment', () => mfaClient.setup(mfaUser.token));
    await test.step('Then the manual key, URI, PNG and expiry are valid and MFA remains disabled', async () => {
      const { setup, totp } = await expectMfaSetup(response, mfaUser.user.username);
      mfaUser.setup = setup;
      mfaUser.totp = totp;
      expect(await mfaJson<MfaStatus>(await mfaClient.status(mfaUser.token))).toEqual({ enabled: false, unusedRecoveryCodes: 0 });
    });
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    const response = await test.step('When an anonymous caller starts enrollment', () => mfaClient.setup());
    await test.step('Then authentication is required', () => expectMfaError(response));
  });
});
