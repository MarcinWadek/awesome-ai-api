import { json } from '../../../support/assertions/http';
import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaError, expectMfaSetup } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';
test.describe('POST /api/v1/users/2fa/setup', () => {
  test.describe.configure({ timeout: 90_000 });

  test('200: provisions consistent authenticator data without enabling MFA', async ({ mfaClient, mfaUser }) => {
    // When
    const response = await mfaClient.setup(mfaUser.token);

    // Then
    const { setup, totp } = await expectMfaSetup(response, mfaUser.user.username);
    mfaUser.setup = setup;
    mfaUser.totp = totp;
    expect(await json<MfaStatus>(await mfaClient.status(mfaUser.token))).toEqual({ enabled: false, unusedRecoveryCodes: 0 });
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    // When
    const response = await mfaClient.setup();

    // Then
    await expectMfaError(response);
  });
});
